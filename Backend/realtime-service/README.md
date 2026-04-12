# 🚀 Real-time Service (Socket.IO Cluster)

Đây là Microservice chịu trách nhiệm duy trì kết nối luồng Real-time WebSocket cho toàn bộ hệ thống ứng dụng Alo-Chat (Zalo/Telegram Clone Architect).

## 🌍 Kiến trúc tổng quan

- **Công nghệ Base:** Node.js, Express, Socket.IO.
- **Load Balancing (Intra-service):** Redis (Adapter + Presence).
- **Inter-service Communication:** RabbitMQ (Nhận tín hiệu từ Java `message-service`, `group-service`...).
- **Service Discovery:** Tự động đăng ký qua Netflix Eureka (`discovery-service`).
- **Phân luồng Gateway:** Trình duyệt kết nối qua Spring Cloud Gateway bằng uri `lb:ws://REALTIME-SERVICE`.

---

## 🛠 Hướng dẫn Khởi chạy (Local)

Yêu cầu phải có **Redis** và **RabbitMQ** đang chạy. (Eureka có thể chạy hoặc log lỗi không sao).

    ```
    docker run --rm -d --name alo-redis -p 6379:6379 redis
    docker run --rm -d --name alo-rabbit -p 5672:5672 -p 15672:15672 rabbitmq:3-management
    ```

1. Copy file `.env.example` (hoặc tạo `.env`):
   ```env
   PORT=3000
   REDIS_URL=redis://localhost:6379
   RABBITMQ_URL=amqp://guest:guest@localhost:5672
   JWT_SECRET=your_jwt_secret_key_from_auth_service
   EUREKA_HOST=localhost
   EUREKA_PORT=8761
   ```
2. Cài dependency: `npm install`
3. Chạy server: `npm run dev`

---

## 👨‍💻 DÀNH CHO TEAM BACKEND JAVA (`message-service`, `contact-service`...)

Backend KHÔNG GỌI REST API qua service này. Mọi tương tác đẩy qua **RabbitMQ**.

- **Queue lắng nghe:** `realtime_events`
- **Format Data (JSON):**
  ```json
  {
    "event": "TÊN_SỰ_KIỆN",
    "target": "USER_ID", // (Tùy chọn) Gửi đích danh cho 1 user
    "room": "GROUP_ID", // (Tùy chọn) Gửi cho cả room chat nhóm
    "data": {
      // Nội dung tùy ý (Tin nhắn, thông báo...)
    }
  }
  ```
- **Ví dụ Code Spring Boot (Java):**
  ```java
  rabbitTemplate.convertAndSend("realtime.exchange", "realtime-routing-key",
     new RealtimePayload("RECEIVE_MESSAGE", "user_123", null, messageBody));
  ```

---

## 📱 DÀNH CHO TEAM FRONTEND (React / React Native)

### 1. Kết nối (Connect)

URL: Nối thông qua API Gateway (Thường là cổng `8888`) với path `/socket.io`.

```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:8888", {
  auth: {
    token: "BỎ_JWT_TOKEN_CỦA_USER_VÀO_ĐÂY",
  },
});
```

### 2. Các sự kiện (Events) Lắng nghe từ Server (Listen)

```javascript
// Nhận tin nhắn mới
socket.on("RECEIVE_MESSAGE", (data) => console.log(data));

// Có người đang gõ phím
socket.on("TYPING", ({ actorId, roomId }) =>
  console.log(actorId + " đang gõ..."),
);

// Có người ngừng gõ phím
socket.on("STOP_TYPING", ({ actorId, roomId }) => console.log("Ngừng gõ"));

// Trạng thái online/offline của user chung
socket.on("USER_ONLINE", ({ userId }) => console.log(userId + " online"));
socket.on("USER_OFFLINE", ({ userId, last_active }) =>
  console.log(userId + " offline"),
);
```

### 3. Các sự kiện Gửi lên Server (Emit)

Sử dụng cho các hành động Real-time cực nhanh < 10ms (Không cần gọi API lưu DB).

```javascript
// Báo cho mạng lưới biết mình đang gõ phím trong group "group_abc"
socket.emit("TYPING", { target: "group_abc", isGroup: true });

// Báo ngừng gõ
socket.emit("STOP_TYPING", { target: "group_abc", isGroup: true });
```
