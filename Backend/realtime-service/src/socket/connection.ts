import { Server, Socket } from "socket.io";
import { presenceClient } from "../config/redis";
import { SOCKET_EVENTS } from "../constants/events";

export function initSocketConnection(io: Server) {
  io.on("connection", async (socket: Socket) => {
    const userId = socket.data.userId;
    console.log(`User connected: ${userId} with socket ID: ${socket.id}`);

    // 1. Join Personal Room để nhận event Push từ các service khác qua RabbitMQ
    socket.join(`user_${userId}`);

    // *TODO: Vị trí chèn logic lấy Group IDs từ Database (hoặc API group-service) sau này*
    // socket.join("room_groupId_abc");

    // 2. Đánh dấu trạng thái Online trên Redis
    await presenceClient.hSet(
      `presence:users`,
      userId,
      JSON.stringify({
        status: "online",
        last_active: Date.now(),
        socket_id: socket.id,
      }),
    );

    // Bắn broadcast (hoặc bắn cho bạn bè) trạng thái Online
    io.emit(SOCKET_EVENTS.USER_ONLINE, { userId, status: "online" });

    // 3. Lắng nghe các event từ Client gửi LÊN server
    // (Ví dụ: Typing Indicator, Message Read, ...)
    socket.on(SOCKET_EVENTS.TYPING, (data) => {
      // { roomId: "abc", isTyping: true }
      // Khi client gõ, mình tìm xem cái room đó bắn phát cho tất cả
      socket.to(`room_${data.roomId}`).emit(SOCKET_EVENTS.TYPING, {
        userId,
        isTyping: data.isTyping,
      });
    });

    // 4. Ngắt kết nối
    socket.on("disconnect", async () => {
      console.log(`User disconnected: ${userId}`);
      await presenceClient.hDel(`presence:users`, userId);
      // Bắn broadcast Offline
      io.emit(SOCKET_EVENTS.USER_OFFLINE, {
        userId,
        status: "offline",
        last_active: Date.now(),
      });
    });
  });
}
