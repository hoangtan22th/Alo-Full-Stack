import amqp from "amqplib";
import { Server } from "socket.io";
import { RABBITMQ_QUEUES } from "../constants/events";
import dotenv from "dotenv";

dotenv.config();

export let amqpChannel: amqp.Channel;

export async function initRabbitMQ(io: Server) {
  const connection = await amqp.connect(
    process.env.RABBITMQ_URL || "amqp://localhost",
  );
  amqpChannel = await connection.createChannel();

  const queue = RABBITMQ_QUEUES.REALTIME_EVENTS || "realtime_events";
  await amqpChannel.assertQueue(queue, { durable: true });
  console.log(`RabbitMQ waiting for messages in ${queue}.`);

  // NEW: Setup binding for Admin Ban Events
  const adminExchange = "admin.exchange";
  const authBanQueue = "realtime.user.banned.queue";
  const authUnbanQueue = "realtime.user.unbanned.queue";
  await amqpChannel.assertExchange(adminExchange, "topic", { durable: true });
  await amqpChannel.assertQueue(authBanQueue, { durable: true });
  await amqpChannel.bindQueue(authBanQueue, adminExchange, "user.banned");
  await amqpChannel.assertQueue(authUnbanQueue, { durable: true });
  await amqpChannel.bindQueue(authUnbanQueue, adminExchange, "user.unbanned");
  console.log(`RabbitMQ waiting for Admin Banned events in ${authBanQueue}.`);
  console.log(
    `RabbitMQ waiting for Admin Unbanned events in ${authUnbanQueue}.`,
  );

  amqpChannel.consume(queue, (msg) => {
    if (msg !== null) {
      try {
        const payload = JSON.parse(msg.content.toString());
        console.log("Received via RabbitMQ:", payload);

        // Map RabbitMQ target to Socket.IO room/user
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
                    s.disconnect(); // Đóng socket luôn cho chắc chắn
                  }
                });
              });
          } else {
            const userRoom = `user_${payload.target}`;
            // Kiểm tra xem có ai trong phòng này không
            io.in(userRoom)
              .fetchSockets()
              .then((sockets) => {
                console.log(
                  `[Socket.IO] Target Room: ${userRoom} | Connected Sockets: ${sockets.length} | Event: ${payload.event}`,
                );
                if (sockets.length > 0) {
                  io.to(userRoom).emit(payload.event, payload.data);
                } else {
                  console.warn(
                    `[Socket.IO] No active sockets found for room ${userRoom}. Message not delivered via Socket.`,
                  );
                }
              });
          }
        } else if (payload.room) {
          console.log(
            `[Socket.IO] Emitting event '${payload.event}' to room: room_${payload.room}`,
          );
          io.to(`room_${payload.room}`).emit(payload.event, payload.data);
        } else {
          console.log(`[Socket.IO] Emitting global event: '${payload.event}'`);
          io.emit(payload.event, payload.data);
        }
      } catch (error) {
        console.error("Error processing RabbitMQ message", error);
      }
      amqpChannel.ack(msg);
    }
  });

  amqpChannel.consume(authBanQueue, async (msg) => {
    if (msg !== null) {
      try {
        const payload = JSON.parse(msg.content.toString());
        console.log("Received USER_BANNED_EVENT via RabbitMQ:", payload);
        const { targetId, adminNotes } = payload;

        if (targetId) {
          const userRoom = `user_${targetId}`;
          const sockets = await io.in(userRoom).fetchSockets();

          if (sockets.length > 0) {
            console.log(
              `[Socket.IO] Disconnecting ${sockets.length} active sockets for Banned User: ${targetId}`,
            );
            sockets.forEach((s) => {
              s.emit("ACCOUNT_BANNED", { reason: adminNotes });
              s.disconnect(true);
            });
          }
        }
      } catch (error) {
        console.error("Error processing Banned Event message", error);
      }
      amqpChannel.ack(msg);
    }
  });

  amqpChannel.consume(authUnbanQueue, async (msg) => {
    if (msg !== null) {
      try {
        const payload = JSON.parse(msg.content.toString());
        console.log("Received USER_UNBANNED_EVENT via RabbitMQ:", payload);
        const { targetId } = payload;
        if (targetId) {
          console.log(
            `[Socket.IO] Processing Unban event for Target: ${targetId}`,
          );
          // Mặc dù Socket có thể không cần thiết phải connect/emit unbanned vì user chưa login, nhưng để log hoặc gửi notif realtime nếu login qua máy khác
        }
      } catch (error) {
        console.error("Error processing Unbanned Event message", error);
      }
      amqpChannel.ack(msg);
    }
  });
}
