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

  amqpChannel.consume(queue, (msg) => {
    if (msg !== null) {
      try {
        const payload = JSON.parse(msg.content.toString());
        console.log("Received via RabbitMQ:", payload);

        // Map RabbitMQ target to Socket.IO room/user
        if (payload.target) {
          if (payload.event === "FORCE_LOGOUT" && payload.data?.killedSessionIds) {
            io.in(`user_${payload.target}`).fetchSockets().then((sockets) => {
              sockets.forEach((s) => {
                const killedIds: string[] = payload.data.killedSessionIds;
                if (killedIds.includes(s.data.sessionId)) {
                  s.emit(payload.event, payload.data);
                  s.disconnect(); // Đóng socket luôn cho chắc chắn
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
      } catch (error) {
        console.error("Error processing RabbitMQ message", error);
      } finally {
        amqpChannel.ack(msg);
      }
    }
  });
}
