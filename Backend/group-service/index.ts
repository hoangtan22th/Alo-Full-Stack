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
app.use(cors());
app.use(express.json());

// Điểm cuối bắt buộc cho Eureka (Để Spring Boot biết Node.js còn sống)
app.get("/info", (req: Request, res: Response) => {
  res.json({ status: "UP", service: "GROUP-SERVICE" });
});

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "UP" });
});

// Gắn Route nghiệp vụ
app.use("/api/v1/groups", groupRoutes);

// Khởi động Server
// Ép kiểu PORT về dạng number cho chuẩn type
const PORT: number = parseInt(process.env.PORT as string, 10) || 8082;

app.listen(PORT, async () => {
  console.log(`🚀 Group Service đang chạy tại http://localhost:${PORT}`);

  // 1. Kết nối MongoDB
  await connectDB();

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
