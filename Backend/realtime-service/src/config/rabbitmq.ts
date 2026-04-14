import amqp from "amqplib";
import { Server } from "socket.io";
import dotenv from "dotenv";

dotenv.config();

export let amqpChannel: amqp.Channel;

const EXCHANGES = {
  CHAT: "chat_exchange",
};

const ROUTING_KEYS = {
  MESSAGE_CREATED: "chat.message.created",
  MESSAGE_UPDATED: "chat.message.updated",
  MESSAGE_DELETED: "chat.message.deleted",
  MESSAGE_READ: "chat.message.read",
  MESSAGE_REACTION: "chat.message.reaction.updated",
  MESSAGE_REVOKED: "chat.message.revoked",
  CONVERSATION_UPDATED: "chat.conversation.updated",
  CONVERSATION_CREATED: "chat.conversation.created",
  CONVERSATION_REMOVED: "chat.conversation.removed",
  CONVERSATION_PIN_UPDATED: "chat.conversation.pin_updated",
  CONVERSATION_LABEL_UPDATED: "chat.conversation.label_updated",
};

// Queue chung cho toàn bộ cluster realtime khi có Redis Adapter
const QUEUE_NAME = "realtime_cluster_queue";

export async function initRabbitMQ(io: Server) {
  try {
    const connection = await amqp.connect(
      process.env.RABBITMQ_URL || "amqp://localhost",
    );
    amqpChannel = await connection.createChannel();

    // 1. Phải khai báo lại Exchange để đảm bảo có tồn tại
    await amqpChannel.assertExchange(EXCHANGES.CHAT, "topic", {
      durable: true,
    });

    // 2. Khai báo 1 Queue cố định (Durable)
    const q = await amqpChannel.assertQueue(QUEUE_NAME, { durable: true });

    // 3. Bind Queue vào Exchange Chat
    // Lắng nghe tất cả sự kiện tin nhắn (Dùng # để match nhiều cấp độ chữ, ví dụ: chat.message.reaction.updated)
    await amqpChannel.bindQueue(q.queue, EXCHANGES.CHAT, "chat.message.#");
    // Lắng nghe sự kiện update conversation
    await amqpChannel.bindQueue(q.queue, EXCHANGES.CHAT, "chat.conversation.#");

    console.log(
      `[RabbitMQ] Bounded to Exchange [${EXCHANGES.CHAT}] on queue [${q.queue}]`,
    );

    // KHÔI PHỤC LẠI LUỒNG CŨ CHO CÁC SERVICE KHÁC CHƯA REFACTOR (Ví dụ Auth Service bắn FORCE_LOGOUT vào realtime_events)
    const legacyQueue = "realtime_events";
    await amqpChannel.assertQueue(legacyQueue, { durable: true });

    // Xử lý chung message handler
    const processMessage = (msg: amqp.ConsumeMessage | null) => {
      if (!msg) return;

      try {
        const rawContent = msg.content.toString();
        const payload = JSON.parse(rawContent);

        // NẾU LÀ PAYLOAD CHUẨN MỚI TỪ EXCHANGE (Có type và data)
        const routingKey = msg.fields.routingKey;
        const exchange = msg.fields.exchange;

        if (exchange === EXCHANGES.CHAT) {
          const { type, data } = payload;

          if (routingKey === ROUTING_KEYS.MESSAGE_CREATED) {
            io.to(`room_${data.conversationId}`).emit("message-received", data);
          } else if (routingKey === ROUTING_KEYS.MESSAGE_UPDATED) {
            io.to(`room_${data.conversationId}`).emit("MESSAGE_UPDATED", data);
          } else if (routingKey === ROUTING_KEYS.MESSAGE_READ) {
            io.to(`room_${data.conversationId}`).emit("messages-read", data);
          } else if (routingKey === ROUTING_KEYS.MESSAGE_REACTION) {
            io.to(`room_${data.conversationId}`).emit(
              "message-reaction-updated",
              data,
            );
          } else if (routingKey === ROUTING_KEYS.MESSAGE_REVOKED) {
            io.to(`room_${data.conversationId}`).emit("message-revoked", data);
          } else if (routingKey === ROUTING_KEYS.MESSAGE_DELETED) {
            io.to(`room_${data.conversationId}`).emit("MESSAGE_DELETED", data); // Tuỳ UI bạn map event nào
          } else if (routingKey === ROUTING_KEYS.CONVERSATION_UPDATED) {
            // Broadcast đến các thành viên trong room chat
            io.to(`room_${data.conversationId}`).emit(
              "CONVERSATION_UPDATED",
              data,
            );
          } else if (routingKey === ROUTING_KEYS.CONVERSATION_CREATED) {
            // Nhóm tạo mới -> Ép các thành viên join room để từ bây giờ nhận được tin nhắn realtime
            if (data.members) {
              data.members.forEach((m: any) => {
                const userId = m.userId;
                io.in(`user_${userId}`).fetchSockets().then(sockets => {
                  sockets.forEach(s => {
                    s.join(`room_${data._id}`); // Thực hiện join room thực tế trên Socket.IO
                    s.emit("CONVERSATION_CREATED", data); // Thông báo cho client UI update danh sách
                  });
                });
              });
            }
          } else if (routingKey === ROUTING_KEYS.CONVERSATION_REMOVED) {
             // Ai đó bị kick, hoặc rời nhóm -> Ép huỷ kết nối room
             io.in(`user_${data.userId}`).fetchSockets().then(sockets => {
               sockets.forEach(s => {
                  s.leave(`room_${data.conversationId}`);
                  s.emit("CONVERSATION_REMOVED", data); // Báo xuống client
               });
             });
          } else if (routingKey === ROUTING_KEYS.CONVERSATION_PIN_UPDATED) {
             io.to(`user_${data.userId}`).emit("CONVERSATION_PIN_UPDATED", data);
          } else if (routingKey === ROUTING_KEYS.CONVERSATION_LABEL_UPDATED) {
             io.to(`user_${data.userId}`).emit("CONVERSATION_LABEL_UPDATED", data);
          }
        }
        // NẾU LÀ PAYLOAD LẠC HẬU TỪ DIRECT QUEUE (Ví dụ FORCE_LOGOUT)
        else {
          if (payload.target) {
            if (
              payload.event === "FORCE_LOGOUT" &&
              payload.data?.killedSessionIds
            ) {
              io.in(`user_${payload.target}`)
                .fetchSockets()
                .then((sockets) => {
                  sockets.forEach((s) => {
                    const killedIds: string[] = payload.data.killedSessionIds;
                    if (killedIds.includes(s.data.sessionId)) {
                      s.emit(payload.event, payload.data);
                      s.disconnect();
                    }
                  });
                });
            } else {
              io.to(`user_${payload.target}`).emit(payload.event, payload.data);
            }
          } else if (payload.room) {
            io.to(`room_${payload.room}`).emit(payload.event, payload.data);
          } else {
            io.emit(payload.event, payload.data);
          }
        }

        amqpChannel.ack(msg);
      } catch (error) {
        console.error("[RabbitMQ] Error processing event:", error);
        // Nack (Từ chối) message nếu lỗi cú pháp, để không kẹt chết trong loop, loại bỏ (false, false)
        amqpChannel.nack(msg, false, false);
      }
    };

    // Bắt đầu lắng nghe cả 2 source
    amqpChannel.consume(q.queue, processMessage);
    amqpChannel.consume(legacyQueue, processMessage);
  } catch (error) {
    console.error("[RabbitMQ] Critical Init Error", error);
  }
}
