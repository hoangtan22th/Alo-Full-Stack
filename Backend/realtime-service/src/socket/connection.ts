import { Server, Socket } from "socket.io";
import { presenceClient } from "../config/redis";
import { SOCKET_EVENTS } from "../constants/events";

// Mock fetch groups from group-service
async function fetchUserGroups(userId: string): Promise<string[]> {
  // TODO: use axios to call http://group-service:8080/api/groups/user/ + userId
  return ["group_001", "group_002"];
}

export function initSocketConnection(io: Server) {
  io.on("connection", async (socket: Socket) => {
    const userId = socket.data.userId;
    console.log(`User connected: ${userId} with socket ID: ${socket.id}`);

    // 1. Join Personal Room for 1v1 messages
    socket.join(`user_${userId}`);

    // 2. Auto join all Group Chat rooms
    try {
      const gIds = await fetchUserGroups(userId);
      gIds.forEach(groupId => {
        socket.join(`room_${groupId}`);
      });
      console.log(`User ${userId} joined groups:`, gIds);
    } catch (error) {
      console.error(`Error fetching groups for user ${userId}:`, error);
    }

    // 3. Mark user as Online in Redis
    await presenceClient.hSet(`presence:users`, userId, JSON.stringify({
      status: "online",
      last_active: Date.now(),
      socket_id: socket.id
    }));

    // Broadcast Online status
    socket.broadcast.emit(SOCKET_EVENTS.USER_ONLINE, { userId, status: "online" });

    // ============================================
    // REAL-TIME INTERACTION EVENTS (< 10ms)
    // ============================================

    // 4. Handle Typing Event
    socket.on(SOCKET_EVENTS.TYPING, (data: { target: string, isGroup: boolean }) => {
      const emitTarget = data.isGroup ? `room_${data.target}` : `user_${data.target}`;
      
      socket.to(emitTarget).emit(SOCKET_EVENTS.TYPING, {
        actorId: userId,  // Who is typing
        roomId: data.target // Target room/user
      });
    });

    // 5. Handle Stop Typing Event
    socket.on(SOCKET_EVENTS.STOP_TYPING, (data: { target: string, isGroup: boolean }) => {
      const emitTarget = data.isGroup ? `room_${data.target}` : `user_${data.target}`;
      
      socket.to(emitTarget).emit(SOCKET_EVENTS.STOP_TYPING, {
        actorId: userId,
        roomId: data.target
      });
    });

    // ============================================
    // CONNECTION MANAGEMENT (DISCONNECT)
    // ============================================
    socket.on("disconnect", async () => {
      console.log(`User disconnected: ${userId}`);
      
      // Remove presence
      await presenceClient.hDel(`presence:users`, userId);
      
      // Broadcast Offline status
      socket.broadcast.emit(SOCKET_EVENTS.USER_OFFLINE, { 
        userId, 
        status: "offline", 
        last_active: Date.now() 
      });
    });
  });
}
