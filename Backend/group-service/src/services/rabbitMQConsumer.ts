import { getChannel } from "../config/rabbitmq";
import Conversation from "../models/Conversation";
import { Types } from "mongoose";

export async function startRabbitMQConsumer() {
  try {
    const channel = getChannel();
    const queueName = "group_service_message_queue";

    // Khởi tạo queue riêng cho group-service để nhận copy tin nhắn
    await channel.assertQueue(queueName, { durable: true });

    // Bind vào chat_exchange với các routing key cần thiết
    await channel.bindQueue(queueName, "chat_exchange", "chat.message.created");
    await channel.bindQueue(queueName, "chat_exchange", "chat.message.read");

    console.log(`[*] Group Service is waiting for messages in ${queueName}.`);

    channel.consume(queueName, async (msg) => {
      if (msg !== null) {
        try {
          const content = JSON.parse(msg.content.toString());
          const { type, data } = content;

          if (type === "message.created") {
            const { conversationId, _id: messageId, createdAt, content: msgContent, type: msgType, senderId } = data;

            console.log(`[RabbitMQConsumer] Updating lastMessage and incrementing unread for conversation: ${conversationId}`);

            let lastContent = msgContent || "";
            if (msgType === "image") lastContent = "[Hình ảnh]";
            else if (msgType === "file") lastContent = "[Tệp tin]";

            // 1. Tìm conversation để lấy danh sách members
            const conversation = await Conversation.findById(conversationId);
            if (!conversation) {
              console.warn(`[RabbitMQConsumer] Conversation not found: ${conversationId}`);
              channel.ack(msg);
              return;
            }

            // 2. Cập nhật lastMessage và Tăng unreadCount cho các thành viên khác
            const updateObj: any = {
              $set: { 
                lastMessage: new Types.ObjectId(messageId),
                lastMessageAt: new Date(createdAt),
                lastMessageContent: lastContent
              }
            };

            // Increment unreadCount for all members except sender
            conversation.members.forEach(member => {
              if (member.userId !== senderId) {
                const currentCount = conversation.unreadCount.get(member.userId) || 0;
                updateObj.$set[`unreadCount.${member.userId}`] = currentCount + 1;
              }
            });

            const updatedConversation = await Conversation.findByIdAndUpdate(
              conversationId,
              updateObj,
              { new: true }
            );

            if (updatedConversation) {
              updatedConversation.members.forEach((member: any) => {
                const realtimePayload = {
                  event: "CONVERSATION_UPDATED",
                  target: member.userId,
                  data: {
                    conversationId: updatedConversation._id,
                    lastMessageContent: updatedConversation.lastMessageContent,
                    lastMessageAt: updatedConversation.lastMessageAt,
                    lastMessageId: updatedConversation.lastMessage,
                    unreadCount: updatedConversation.unreadCount.get(member.userId) || 0,
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
          } else if (type === "message.read") {
            const { conversationId, userId } = data;
            console.log(`[RabbitMQConsumer] Resetting unreadCount for user ${userId} in conversation ${conversationId}`);

            const updatedConversation = await Conversation.findByIdAndUpdate(
              conversationId,
              {
                $set: { [`unreadCount.${userId}`]: 0 }
              },
              { new: true }
            );

            if (updatedConversation) {
              const realtimePayload = {
                event: "CONVERSATION_UPDATED",
                target: userId,
                data: {
                  conversationId: updatedConversation._id,
                  unreadCount: 0,
                  updatedAt: updatedConversation.updatedAt
                },
              };

              channel.sendToQueue(
                "realtime_events",
                Buffer.from(JSON.stringify(realtimePayload)),
                { persistent: true }
              );
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
