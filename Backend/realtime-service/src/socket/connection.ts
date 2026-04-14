import { Server, Socket } from "socket.io";
import axios from "axios";
import { presenceClient } from "../config/redis";
import { SOCKET_EVENTS } from "../constants/events";

// Fetch groups from group-service via API Gateway
async function fetchUserGroups(
  userId: string,
  token: string,
): Promise<string[]> {
  try {
    // Determine the API Gateway URL or direct group-service URL
    const gatewayUrl = process.env.GATEWAY_URL || "http://localhost:8888";

    // Yêu cầu lấy TẤT CẢ cuộc hội thoại (bao gồm cả chat 1-1 và Nhóm)
    const response = await axios.get(
      `${gatewayUrl}/api/v1/groups/me?type=all`,
      {
        headers: {
          Authorization: `Bearer ${token}`, // Pass the JWT token to bypass API Gateway auth
          "X-User-Id": userId, // Pass the internal header required by group-service just in case
        },
      },
    );

    // Extract group IDs from the response payload structure expected from group-service
    // The controller returns: res.status(200).json({ data: groups });
    const groups = response.data?.data || [];
    return groups.map((g: any) => g._id.toString());
  } catch (error: any) {
    console.error(`fetchUserGroups Error: ${error?.message}`);
    return [];
  }
}

export function initSocketConnection(io: Server) {
  io.on("connection", async (socket: Socket) => {
    const userId = socket.data.userId;
    // Bóc token từ handshake y như trong auth.ts
    const token =
      socket.handshake.auth.token ||
      socket.handshake.headers["authorization"]?.replace("Bearer ", "");

    console.log(`User connected: ${userId} with socket ID: ${socket.id}`);

    // 1. Join Personal Room for 1v1 messages
    socket.join(`user_${userId}`);

    // Join Session Room for specific device targeting (FORCE_LOGOUT)
    const sessionId = socket.data.sessionId;
    if (sessionId) {
      socket.join(`session_${sessionId}`);
    }

    // 2. Auto join all Group Chat rooms
    try {
      const gIds = await fetchUserGroups(userId, token);
      gIds.forEach((groupId) => {
        socket.join(`room_${groupId}`);
      });
      console.log(`User ${userId} joined groups:`, gIds);
    } catch (error) {
      console.error(`Error fetching groups for user ${userId}:`, error);
    }

    // 3. Mark user as Online in Redis
    await presenceClient.hSet(
      `presence:users`,
      userId,
      JSON.stringify({
        status: "online",
        last_active: Date.now(),
        socket_id: socket.id,
      }),
    );

    // Broadcast Online status
    socket.broadcast.emit(SOCKET_EVENTS.USER_ONLINE, {
      userId,
      status: "online",
    });

    // ============================================
    // REAL-TIME INTERACTION EVENTS (< 10ms)
    // ============================================

    // 4. Handle Typing Event (Simplify to always use room_)
    socket.on(
      SOCKET_EVENTS.TYPING,
      (data: { target: string; isGroup: boolean }) => {
        // Luôn sử dụng room_ prefix vì giờ đây user đã join room cho mọi conversation
        const emitTarget = `room_${data.target}`;

        socket.to(emitTarget).emit(SOCKET_EVENTS.TYPING, {
          actorId: userId, // Who is typing
          roomId: data.target, // Target room
        });
      },
    );

    // 5. Handle Stop Typing Event
    socket.on(
      SOCKET_EVENTS.STOP_TYPING,
      (data: { target: string; isGroup: boolean }) => {
        const emitTarget = `room_${data.target}`;

        socket.to(emitTarget).emit(SOCKET_EVENTS.STOP_TYPING, {
          actorId: userId,
          roomId: data.target,
        });
      },
    );

    // 6. Check User Status
    socket.on("CHECK_USER_STATUS", async (targetUserId: string) => {
      try {
        const presenceStr = await presenceClient.hGet(
          `presence:users`,
          targetUserId,
        );
        if (presenceStr) {
          const presence = JSON.parse(presenceStr);
          socket.emit("USER_STATUS_RESULT", {
            userId: targetUserId,
            status: presence.status,
            last_active: presence.last_active,
          });
        }
      } catch (error) {
        console.error("Error checking user status", error);
      }
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
        last_active: Date.now(),
      });
    });
  });
}
