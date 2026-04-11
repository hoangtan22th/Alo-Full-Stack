import express from "express";
import http from "http";
import { Server } from "socket.io";
import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-adapter";
import amqp from "amqplib";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Adjust in production
    methods: ["GET", "POST"],
  },
});

// Redis setup for Adapter (Node <-> Node)
const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

// Presence Redis Client
const presenceClient = pubClient.duplicate();

// RabbitMQ setup (Java/Node -> Node)
let amqpChannel: amqp.Channel;

// Authentication Middleware
// io.use((socket, next) => {
//   const token =
//     socket.handshake.auth.token ||
//     socket.handshake.headers["authorization"]?.replace("Bearer ", "");
//   if (!token) return next(new Error("Authentication error: No token provided"));

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret") as {
//       userId: string;
//     };
//     socket.data.userId = decoded.userId;
//     next();
//   } catch (err) {
//     next(new Error("Authentication error: Invalid token"));
//   }
// });

io.on("connection", async (socket) => {
  //   const userId = socket.data.userId;
  const userId = "123";
  console.log(`User connected: ${userId} with socket ID: ${socket.id}`);

  // 1. Join personal room (so we can send specific events to this user across cluster)
  socket.join(`user_${userId}`);

  // 2. Mark user as online in Redis Presence
  await presenceClient.hSet(
    `presence:users`,
    userId,
    JSON.stringify({
      status: "online",
      last_active: Date.now(),
      socket_id: socket.id,
    }),
  );

  // Emit online status broadcast
  io.emit("user_status_changed", { userId, status: "online" });

  socket.on("disconnect", async () => {
    console.log(`User disconnected: ${userId}`);
    await presenceClient.hDel(`presence:users`, userId);
    io.emit("user_status_changed", {
      userId,
      status: "offline",
      last_active: Date.now(),
    });
  });
});

async function initBrokers() {
  try {
    await Promise.all([
      pubClient.connect(),
      subClient.connect(),
      presenceClient.connect(),
    ]);
    io.adapter(createAdapter(pubClient, subClient));
    console.log("Redis connecting ok!");

    const connection = await amqp.connect(
      process.env.RABBITMQ_URL || "amqp://localhost",
    );
    amqpChannel = await connection.createChannel();
    const queue = "realtime_events";

    await amqpChannel.assertQueue(queue, { durable: true });
    console.log(`RabbitMQ waiting for messages in ${queue}.`);

    amqpChannel.consume(queue, (msg) => {
      if (msg !== null) {
        try {
          // Payload format: { event: "NEW_MESSAGE", target: "user_B", data: {...} }
          const payload = JSON.parse(msg.content.toString());
          console.log("Received via RabbitMQ:", payload);

          // Emit using Socket.io (adapter handles broadcasting if target user in another instance)
          if (payload.target) {
            io.to(`user_${payload.target}`).emit(payload.event, payload.data);
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
  } catch (error) {
    console.error("Failed to initialize brokers:", error);
    process.exit(1);
  }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
  console.log(`Real-time service is running on port ${PORT}`);
  await initBrokers();
});
