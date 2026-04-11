import express from "express";
import http from "http";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import dotenv from "dotenv";

import { initRedis, pubClient, subClient } from "./config/redis";
import { initRabbitMQ } from "./config/rabbitmq";
import { socketAuthMiddleware } from "./middlewares/auth";
import { initSocketConnection } from "./socket/connection";

dotenv.config();

const app = express();
const server = http.createServer(app);

// 1. Default Socket Server Setup
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

// 2. Auth Middleware
io.use(socketAuthMiddleware);

async function startServer() {
  try {
    // 3. Init Redis Adapter
    await initRedis();
    io.adapter(createAdapter(pubClient, subClient));

    // 4. Init RabbitMQ Consumer
    await initRabbitMQ(io);

    // 5. Init Socket Connections and Events
    initSocketConnection(io);

    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      console.log(`?? Real-time service is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("? Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
