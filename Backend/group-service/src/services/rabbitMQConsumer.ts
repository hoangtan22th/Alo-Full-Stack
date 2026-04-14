import { getChannel } from "../config/rabbitmq";
import Conversation from "../models/Conversation";
import { Types } from "mongoose";

export async function startRabbitMQConsumer() {
  try {
    const channel = getChannel();
    const queueName = "group_service_message_queue";

    // Khởi tạo queue riêng cho group-service để nhận copy tin nhắn
    await channel.assertQueue(queueName, { durable: true });

    // Bind vào chat_exchange với routing key chat.message.created
    // Lưu ý: EXCHANGE CHAT là 'chat_exchange' (theo message-service)
    await channel.bindQueue(queueName, "chat_exchange", "chat.message.created");

    console.log(`[*] Group Service is waiting for messages in ${queueName}.`);

    channel.consume(queueName, async (msg) => {
      if (msg !== null) {
        try {
          const content = JSON.parse(msg.content.toString());
          const { type, data } = content;

          if (type === "message.created") {
            const { conversationId, _id: messageId, createdAt, content, type: msgType, senderId } = data;

            console.log(`[RabbitMQConsumer] Updating lastMessage for conversation: ${conversationId}`);

            let lastContent = content || "";
            if (msgType === "image") lastContent = "[Hình ảnh]";
            else if (msgType === "file") lastContent = "[Tệp tin]";

            const updatedConversation = await Conversation.findByIdAndUpdate(
              conversationId,
              {
                $set: { 
                  lastMessage: new Types.ObjectId(messageId),
                  lastMessageAt: new Date(createdAt),
                  lastMessageContent: lastContent
                },
              },
              { new: true } // Lấy bản update kèm danh sách members
            );

            if (updatedConversation) {
              // Gửi notify REALTIME cho tất cả thành viên trong nhóm 
              // qua realtime-service (Personal user room: user_ID)
              updatedConversation.members.forEach((member: any) => {
                const realtimePayload = {
                  event: "CONVERSATION_UPDATED",
                  target: member.userId,
                  data: {
                    conversationId: updatedConversation._id,
                    lastMessageContent: updatedConversation.lastMessageContent,
                    lastMessageAt: updatedConversation.lastMessageAt,
                    lastMessageId: updatedConversation.lastMessage,
                    updatedAt: updatedConversation.updatedAt,
                    senderId: senderId
                  },
                };

                console.log(`[RabbitMQConsumer] Broadcasting CONVERSATION_UPDATED to user: ${member.userId}`);
                channel.sendToQueue(
                  "realtime_events",
                  Buffer.from(JSON.stringify(realtimePayload)),
                  { persistent: true }
                );
              });
              console.log(`[RabbitMQConsumer] Successfully broadcasted update to ${updatedConversation.members.length} members`);
            }
          }

          channel.ack(msg);
        } catch (error) {
          console.error("[RabbitMQConsumer] Error processing message:", error);
          // Nack and requeue if error? For now just ack to avoid loop
          channel.ack(msg);
        }
      }
    });
  } catch (error) {
    console.error("[RabbitMQConsumer] Failed to start consumer:", error);
  }
}
