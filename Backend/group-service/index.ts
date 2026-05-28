// index.ts
import dotenv from "dotenv";
// Gọi config ngay lập tức để load biến môi trường trước khi khởi tạo các module khác
dotenv.config();

import express, { Application, Request, Response } from "express";
import cors from "cors";

// Import các module của bạn
import connectDB from "./src/config/db";
import eurekaClient from "./src/config/eureka-client";
import groupRoutes from "./src/routes/group.routes";

// Khai báo app với kiểu Application của Express
const app: Application = express();

// Middlewares
// Bỏ CORS ở các service bên dưới vì API Gateway đã đảm nhận. Nếu mở cả 2 sẽ sinh ra lỗi 'Multiple Access-Control-Allow-Origin'
// app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  console.log(`[group-service] ${req.method} ${req.url}`);
  next();
});

// Điểm cuối bắt buộc cho Eureka (Để Spring Boot biết Node.js còn sống)
app.get("/info", (req: Request, res: Response) => {
  res.json({ status: "UP", service: "GROUP-SERVICE" });
});

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "UP" });
});

// Gắn Route nghiệp vụ
// app.use("/api/v1/groups", groupRoutes);
app.use("/", groupRoutes);

// Khởi động Server
// Ép kiểu PORT về dạng number cho chuẩn type
const PORT: number = parseInt(process.env.PORT as string, 10) || 8082;

app.listen(PORT, async () => {
  console.log(`🚀 Group Service đang chạy tại http://localhost:${PORT}`);

  // 1. Kết nối MongoDB
  await connectDB();

  try {
    const { connectRabbitMQ } = require("./src/config/rabbitmq");
    await connectRabbitMQ();
    // Khởi chạy Consumer để lắng nghe tin nhắn mới nhằm update lastMessage
    const { startRabbitMQConsumer } = require("./src/services/rabbitMQConsumer");
    await startRabbitMQConsumer();

    // Khởi chạy worker nhắc hẹn
    const { startReminderWorker } = require("./src/services/reminderWorker");
    startReminderWorker();

    // Khởi chạy worker xử lý report cho Group
    const { startReportWorker } = require("./src/workers/reportWorker");
    const { getChannel } = require("./src/config/rabbitmq");
    await startReportWorker(getChannel());
  } catch (err) {
    console.error("❌ Lỗi kết nối RabbitMQ:", err);
  }

  // 2. Báo cáo có mặt với Eureka
  // Khai báo kiểu error là any để tránh lỗi type checker
  eurekaClient.start((error: any) => {
    if (error) {
      console.error(
        "❌ Không thể kết nối tới Eureka Server:",
        error.message || error,
      );
    } else {
      console.log("✅ Đã đăng ký thành công với Eureka Server");
    }
  });
});
