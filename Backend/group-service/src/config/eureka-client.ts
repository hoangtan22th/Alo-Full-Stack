// src/config/eureka-client.ts
import { Eureka } from "eureka-js-client";
import dotenv from "dotenv";

dotenv.config();

// Chuyển đổi PORT từ chuỗi (string) sang số (number) để đảm bảo Type Safety
const PORT: number = parseInt(process.env.PORT as string, 10) || 8082;

const eurekaClient = new Eureka({
  // 1. Thông tin khai báo của bản thân group-service
  instance: {
    app: "GROUP-SERVICE", // Trùng tên với Gateway cấu hình để nó map đúng route
    hostName: "localhost",
    ipAddr: "127.0.0.1",
    statusPageUrl: `http://localhost:${PORT}/info`,
    healthCheckUrl: `http://localhost:${PORT}/health`,
    port: {
      $: PORT,
      "@enabled": true, // TypeScript dùng boolean `true` thay vì chuỗi `"true"`
    },
    vipAddress: "group-service",
    dataCenterInfo: {
      "@class": "com.netflix.appinfo.InstanceInfo$DefaultDataCenterInfo",
      name: "MyOwn",
    },
  },
  // 2. Tương đương với defaultZone bên Spring Boot
  eureka: {
    host: process.env.EUREKA_HOST || "localhost",
    // Chuyển EUREKA_PORT từ chuỗi sang số
    port: parseInt(process.env.EUREKA_PORT as string, 10) || 8761,
    servicePath: "/eureka/apps/", // Đây là path chuẩn để Nodejs gọi vào máy chủ Spring
    maxRetries: 10,
    requestRetryDelay: 2000,
  },
});

export default eurekaClient;
