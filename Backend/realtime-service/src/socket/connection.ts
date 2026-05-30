import { Server, Socket } from "socket.io";
import axios from "axios";
import { presenceClient } from "../config/redis";
import { SOCKET_EVENTS } from "../constants/events";
import { amqpChannel } from "../config/rabbitmq";

// Fetch groups from group-service via API Gateway
async function fetchUserGroups(
  userId: string,
  token: string,
): Promise<string[]> {
  try {
    // Determine the API Gateway URL or direct group-service URL
    const gatewayUrl = process.env.GATEWAY_URL || "http://localhost:8888";

    // Yêu cầu lấy TẤT CẢ cuộc hội thoại (bao gồm cả chat 1-1 và Nhóm)
    const response = await axios.get(`${gatewayUrl}/api/v1/groups/me?type=all`, {
      headers: {
        Authorization: `Bearer ${token}`, // Pass the JWT token to bypass API Gateway auth
        "X-User-Id": userId, // Pass the internal header required by group-service just in case
      },
    });

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

    // 1.1 Join Admin Notifications Room if user is an admin
    const roles = socket.data.roles || [];
    const isAdmin = roles.includes("ROLE_ADMIN") || roles.includes("ROLE_SUPER_ADMIN");
    if (isAdmin) {
      socket.join("admin_notifications");
      console.log(`Admin ${userId} joined admin_notifications room`);
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
    let isAlreadyOnline = false;
    try {
      const presenceStr = await presenceClient.hGet(`presence:users`, userId);
      if (presenceStr) {
        const presence = JSON.parse(presenceStr);
        if (presence.status === "online") {
          isAlreadyOnline = true;
        }
      }
    } catch (e) {}

    await presenceClient.hSet(
      `presence:users`,
      userId,
      JSON.stringify({
        status: "online",
        last_active: Date.now(),
        socket_id: socket.id,
      }),
    );

    if (!isAlreadyOnline) {
      await presenceClient.incr(`presence:stats:online_count`);
    }

    // Broadcast Online status
    socket.broadcast.emit(SOCKET_EVENTS.USER_ONLINE, {
      userId,
      status: "online",
    });

    // 3.1 Sync with User Service via RabbitMQ
    if (amqpChannel) {
      amqpChannel.publish(
        "presence_events",
        "user.online",
        Buffer.from(JSON.stringify({ userId, timestamp: Date.now() })),
      );
    }

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

    // 5.1. Handle Manual Join Room (for newly created groups)
    socket.on("joinRoom", (roomId: string) => {
      console.log(`[Socket.IO] User ${userId} manually joining room: room_${roomId}`);
      socket.join(`room_${roomId}`);
    });

    // 5.2 Handle Call Signaling
    socket.on("CALL_INITIATED", (data: { targetRoom: string; caller: any; isVideo: boolean; inviteeIds?: string[]; isGroup?: boolean }) => {
      console.log(`[Socket.IO] Call initiated by ${userId} to room_${data.targetRoom}`);
      const payload = {
        roomId: data.targetRoom,
        caller: data.caller,
        isVideo: data.isVideo,
        isGroup: data.isGroup || false
      };

      if (data.inviteeIds && data.inviteeIds.length > 0) {
        data.inviteeIds.forEach(id => {
          socket.to(`user_${id}`).emit("INCOMING_CALL", payload);
        });
      } else {
        socket.to(`room_${data.targetRoom}`).emit("INCOMING_CALL", payload);
      }
    });

    socket.on("CANCEL_CALL", (data: { targetRoom: string; inviteeIds?: string[] }) => {
      console.log(`[Socket.IO] Call canceled by ${userId} for room_${data.targetRoom}`);
      if (data.inviteeIds && data.inviteeIds.length > 0) {
        data.inviteeIds.forEach(id => {
          socket.to(`user_${id}`).emit("CALL_CANCELED", { roomId: data.targetRoom });
        });
      } else {
        socket.to(`room_${data.targetRoom}`).emit("CALL_CANCELED", {
          roomId: data.targetRoom,
        });
      }
    });
    
    socket.on("CALL_DECLINED", (data: { targetRoom: string }) => {
      console.log(`[Socket.IO] Call declined by ${userId} for room_${data.targetRoom}`);
      socket.to(`room_${data.targetRoom}`).emit("CALL_DECLINED", {
        roomId: data.targetRoom,
        userId: userId // Tell others who declined
      });
    });

    socket.on("CALL_BUSY", (data: { targetRoom: string }) => {
      console.log(`[Socket.IO] Call busy from ${userId} for room_${data.targetRoom}`);
      socket.to(`room_${data.targetRoom}`).emit("CALL_BUSY", {
        roomId: data.targetRoom,
        userId: userId
      });
    });

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

    // 7. Social Events (Bypass RabbitMQ for simple UI notifications)
    socket.on("EMIT_FRIEND_REQUEST_SENT", (data: { recipientId: string; requesterName: string; requesterAvatar?: string }) => {
      console.log(`[Socket.IO] Friend request from ${userId} to ${data.recipientId}`);
      socket.to(`user_${data.recipientId}`).emit("NEW_FRIEND_REQUEST", {
        requesterId: userId,
        requesterName: data.requesterName,
        requesterAvatar: data.requesterAvatar,
      });
    });

    socket.on("EMIT_FRIEND_REQUEST_ACCEPTED", (data: { recipientId: string; accepterName: string }) => {
      console.log(`[Socket.IO] Friend request accepted by ${userId} for ${data.recipientId}`);
      // Notify the original requester
      socket.to(`user_${data.recipientId}`).emit("FRIEND_REQUEST_ACCEPTED", {
        accepterId: userId,
        accepterName: data.accepterName,
      });
      // Also notify everyone to refresh friend lists
      io.to(`user_${data.recipientId}`).to(`user_${userId}`).emit("FRIEND_LIST_UPDATED", {});
    });

    // 8. Social Post & Story Real-time Interactions
    socket.on("joinPost", (postId: string) => {
      console.log(`[Socket.IO] User ${userId} joining post room: post_${postId}`);
      socket.join(`post_${postId}`);
    });

    socket.on("leavePost", (postId: string) => {
      console.log(`[Socket.IO] User ${userId} leaving post room: post_${postId}`);
      socket.leave(`post_${postId}`);
    });

    socket.on("postInteraction", (data: { postId: string; eventType: string; payload: any }) => {
      console.log(`[Socket.IO] Post interaction from ${userId} on post_${data.postId}: ${data.eventType}`);
      socket.to(`post_${data.postId}`).emit("POST_INTERACTION", {
        actorId: userId,
        postId: data.postId,
        eventType: data.eventType,
        payload: data.payload,
      });
    });

    socket.on("EMIT_NEW_POST", (data: { friendIds: string[]; post: any }) => {
      console.log(`[Socket.IO] New post by ${userId} to friends:`, data.friendIds);
      if (data.friendIds && data.friendIds.length > 0) {
        data.friendIds.forEach((id) => {
          socket.to(`user_${id}`).emit("NEW_POST_RECEIVED", data.post);
        });
      }
    });

    socket.on("EMIT_POST_DELETED", (data: { friendIds: string[]; postId: string }) => {
      console.log(`[Socket.IO] Post deleted by ${userId} to friends:`, data.friendIds);
      if (data.friendIds && data.friendIds.length > 0) {
        data.friendIds.forEach((id) => {
          socket.to(`user_${id}`).emit("POST_DELETED_RECEIVED", { postId: data.postId });
        });
      }
    });

    socket.on("EMIT_NEW_STORY", (data: { friendIds: string[]; story: any }) => {
      console.log(`[Socket.IO] New story by ${userId} to friends:`, data.friendIds);
      if (data.friendIds && data.friendIds.length > 0) {
        data.friendIds.forEach((id) => {
          socket.to(`user_${id}`).emit("NEW_STORY_RECEIVED", data.story);
        });
      }
    });

    socket.on("EMIT_STORY_DELETED", (data: { friendIds: string[]; storyId: string }) => {
      console.log(`[Socket.IO] Story deleted by ${userId} to friends:`, data.friendIds);
      if (data.friendIds && data.friendIds.length > 0) {
        data.friendIds.forEach((id) => {
          socket.to(`user_${id}`).emit("STORY_DELETED_RECEIVED", { storyId: data.storyId });
        });
      }
    });

    // ============================================
    // CONNECTION MANAGEMENT (DISCONNECT)
    // ============================================
    socket.on("disconnect", async () => {
      console.log(`User disconnected: ${userId}`);

      let wasOnline = false;
      try {
        const presenceStr = await presenceClient.hGet(`presence:users`, userId);
        if (presenceStr) {
          const presence = JSON.parse(presenceStr);
          if (presence.status === "online") {
            wasOnline = true;
          }
        }
      } catch (e) {}

      // Update presence to offline instead of deleting
      await presenceClient.hSet(
        `presence:users`,
        userId,
        JSON.stringify({
          status: "offline",
          last_active: Date.now(),
        }),
      );

      if (wasOnline) {
        const count = await presenceClient.decr(`presence:stats:online_count`);
        if (count < 0) {
          await presenceClient.set(`presence:stats:online_count`, "0");
        }
      }

      // Broadcast Offline status
      socket.broadcast.emit(SOCKET_EVENTS.USER_OFFLINE, {
        userId,
        status: "offline",
        last_active: Date.now(),
      });

      // Sync with User Service via RabbitMQ
      if (amqpChannel) {
        amqpChannel.publish(
          "presence_events",
          "user.offline",
          Buffer.from(JSON.stringify({ userId, timestamp: Date.now() })),
        );
      }
    });
  });
}
