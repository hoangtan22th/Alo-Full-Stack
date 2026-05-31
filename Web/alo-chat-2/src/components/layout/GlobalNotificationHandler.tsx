"use client";
import { useEffect, useRef } from "react";
import { socketService } from "@/services/socketService";
import { useChatStore } from "@/store/useChatStore";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";
import { contactService } from "@/services/contactService";
import { groupService } from "@/services/groupService";
import { postService } from "@/services/postService";
import { userService, UserProfileDTO } from "@/services/userService";
import { useRouter, usePathname } from "next/navigation";
import { parseMessageContent } from "@/utils/html";

const userCache: Record<string, UserProfileDTO> = {};

async function getUserProfile(userId: string): Promise<UserProfileDTO | null> {
  if (userCache[userId]) return userCache[userId]!;
  try {
    const profile = await userService.getUserById(userId);
    if (profile) {
      userCache[userId] = profile;
    }
    return profile;
  } catch (e) {
    return null;
  }
}

export default function GlobalNotificationHandler() {
  const { 
    setTyping, 
    typingUsers, 
    friendIds, 
    setFriendIds, 
    setOnlineStatus,
    setUnreadNotifsCount,
    incrementUnreadNotifsCount 
  } = useChatStore();
  const { user: currentUser } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  // Fetch unread notifications count when user logged in
  useEffect(() => {
    if (currentUser) {
      postService.getUnreadNotificationsCount()
        .then((count) => {
          setUnreadNotifsCount(count);
        })
        .catch(console.error);
    }
  }, [currentUser, setUnreadNotifsCount]);

  // Fetch friend list if not already available in store
  useEffect(() => {
    if (currentUser && friendIds.size === 0) {
      contactService.getFriendsList().then(friends => {
        const myId = String(currentUser.id || currentUser._id || currentUser.userId);
        const fIds = new Set(friends.map(f => 
          String(f.requesterId) === myId ? String(f.recipientId) : String(f.requesterId)
        ));
        setFriendIds(fIds);
      }).catch(console.error);
    }
  }, [currentUser, friendIds.size, setFriendIds]);

  const receiveAudio = useRef<HTMLAudioElement | null>(null);
  const typingAudio = useRef<HTMLAudioElement | null>(null);
  const notifAudio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      receiveAudio.current = new Audio("/audio_nhan.MP3");
      typingAudio.current = new Audio("/audio_soan.MP3");
      typingAudio.current.loop = true;
      notifAudio.current = new Audio("/audio_nhan.MP3");
    }

    return () => {
      receiveAudio.current?.pause();
      typingAudio.current?.pause();
      notifAudio.current?.pause();
    };
  }, []);

  // Play typing audio if ANY conversation has typing users (that are not me)
  useEffect(() => {
    const isAnyoneTyping = Object.values(typingUsers).some(users => users.length > 0);
    if (isAnyoneTyping) {
      if (typingAudio.current?.paused) {
        typingAudio.current?.play().catch((e) => console.log("Typing audio play blocked:", e));
      }
    } else {
      typingAudio.current?.pause();
      if (typingAudio.current) typingAudio.current.currentTime = 0;
    }
  }, [typingUsers]);

  useEffect(() => {
    if (!currentUser) return;

    const myId = String(currentUser.id || currentUser._id || currentUser.userId);

    const onMessage = (msg: any) => {
      console.log("📩 [GlobalNotification] Received message event:", msg);
      
      const myId = String(currentUser.id || currentUser._id || currentUser.userId);
      if (String(msg.senderId) === myId) {
        console.log("🚫 [GlobalNotification] Message is from self, skipping notification.");
        return;
      }

      // Play sound - wrap in user interaction check to avoid console errors
      if (receiveAudio.current) {
        receiveAudio.current.currentTime = 0;
        receiveAudio.current.play().catch((e) => {
          if (e.name === 'NotAllowedError') {
            console.warn("🔔 [GlobalNotification] Sound was blocked by browser (autoplay policy). Click anywhere to enable sounds.");
          } else {
            console.error("❌ [GlobalNotification] Sound error:", e);
          }
        });
      }

      const msgConvoId = String(msg.conversationId || msg.roomId || "");
      
      // Extract ID precisely from /chat/[id]
      const pathParts = pathname?.split("/").filter(Boolean) || [];
      const currentConvoId = (pathParts[0] === "chat" && pathParts[1]) ? pathParts[1] : null;
      
      console.log(`🔍 [GlobalNotification] Comparing: ActiveRoom=${currentConvoId}, IncomingMsgRoom=${msgConvoId}`);

      if (currentConvoId !== msgConvoId) {
        // Define system bots that should never be considered strangers
        const BOT_IDS = ["alo-bot", "00000000-0000-0000-0000-000000000000", "11111111-1111-1111-1111-111111111111", "22222222-2222-2222-2222-222222222222"];
        
        // If it's a group or from a bot, it's NOT a stranger conversation
        const isStranger = !msg.isGroup && !friendIds.has(String(msg.senderId)) && !BOT_IDS.includes(String(msg.senderId));
        
        console.log("🔔 [GlobalNotification] Conditions met. Showing toast...", { isStranger });
        
        if (isStranger) {
          toast.warning(`Có người lạ gửi cho bạn 1 tin nhắn`, {
            description: `Từ ${msg.senderName || "Người dùng"}`,
            duration: 5000,
            action: {
              label: "Xem ngay",
              onClick: () => router.push(`/chat/${msgConvoId}`),
            },
          });
        } else {
          toast.info(`Tin nhắn từ ${msg.senderName || "Người dùng"}`, {
            description: msg.type === "text" ? parseMessageContent(msg.content).plainText : (msg.content || (msg.type === "image" ? "[Hình ảnh]" : "Đã gửi một tệp tin")),
            duration: 4000,
            action: {
              label: "Xem ngay",
              onClick: () => router.push(`/chat/${msgConvoId}`),
            },
          });
        }
      } else {
        console.log("🤫 [GlobalNotification] User is in this room, skipping toast.");
      }
    };

    const onTyping = (data: any) => {
      console.log("⌨️ [GlobalNotification] Typing:", data);
      const convoId = data.conversationId || data.roomId;
      const senderId = data.userId || data.senderId;
      if (String(senderId) === myId) return;
      if (convoId) setTyping(String(convoId), String(senderId), true);
    };

    const onStopTyping = (data: any) => {
      console.log("🛑 [GlobalNotification] Stop Typing:", data);
      const convoId = data.conversationId || data.roomId;
      const senderId = data.userId || data.senderId;
      if (convoId) setTyping(String(convoId), String(senderId), false);
    };

    const onNewJoinRequest = (data: any) => {
      console.log("🔔 [GlobalNotification] New Join Request:", data);
      toast.info(`Yêu cầu tham gia nhóm`, {
        description: `${data.requesterName} muốn tham gia nhóm ${data.groupName}`,
        duration: 5000,
      });
    };

    const onJoinRequestApproved = (data: any) => {
      console.log("🔔 [GlobalNotification] Join Request Approved:", data);
      toast.success(`Yêu cầu tham gia được duyệt`, {
        description: `Bạn đã trở thành thành viên của nhóm ${data.groupName}`,
        duration: 5000,
        action: {
          label: "Vào nhóm",
          onClick: () => router.push(`/chat/${data.groupId}`),
        },
      });
    };

    const onJoinRequestRejected = (data: any) => {
      console.log("🔔 [GlobalNotification] Join Request Rejected:", data);
      toast.error(`Yêu cầu tham gia bị từ chối`, {
        description: `Yêu cầu tham gia nhóm ${data.groupName} của bạn không được chấp nhận`,
        duration: 5000,
      });
    };

    const onNewInvitation = (data: any) => {
      console.log("🔔 [GlobalNotification] New Invitation:", data);
      toast.info(`Lời mời vào nhóm`, {
        description: `Bạn nhận được lời mời tham gia nhóm ${data.groupName}`,
        duration: 6000,
        action: {
          label: "Xem ngay",
          onClick: () => router.push("/chat?tab=invitations"),
        },
      });
    };

    const onAddedToGroup = (data: any) => {
      console.log("🔔 [GlobalNotification] Added To Group:", data);
      toast.success(`Bạn đã được thêm vào nhóm`, {
        description: `Bạn đã là thành viên của nhóm ${data.groupName}`,
        duration: 5000,
        action: {
          label: "Vào nhóm",
          onClick: () => router.push(`/chat/${data.groupId}`),
        },
      });
    };

    const onConversationRemoved = (data: any) => {
      console.log("🔔 [GlobalNotification] Conversation Removed:", data);
      
      const { conversationId, groupName, reason } = data;
      
      const title = reason === 'delete' ? "Nhóm đã giải tán" : "Bạn đã rời khỏi nhóm";
      const desc = reason === 'delete' 
        ? `Nhóm "${groupName}" đã bị giải tán bởi quản trị viên hoặc hệ thống.`
        : `Bạn không còn là thành viên của nhóm "${groupName}".`;

      toast.error(title, {
        description: desc,
        duration: 6000,
      });

      // If user is currently in this chat, redirect to /chat
      const pathParts = pathname?.split("/").filter(Boolean) || [];
      const currentConvoId = (pathParts[0] === "chat" && pathParts[1]) ? pathParts[1] : null;
      
      if (currentConvoId === conversationId) {
        router.push("/chat");
      }
      
      // Trigger a refresh of the conversation list if possible
      // (Using a custom event that sidebar can listen to)
      window.dispatchEvent(new CustomEvent("refresh_conversations"));
    };

    const onInvitationAccepted = (data: any) => {
      console.log("🔔 [GlobalNotification] Invitation Accepted:", data);
      toast.success(`Lời mời được chấp nhận`, {
        description: `${data.accepterName} đã chấp nhận lời mời vào nhóm ${data.groupName}`,
        duration: 5000,
      });
    };

    const onUserOnline = (data: { userId: string }) => {
      console.log("🌐 [GlobalNotification] User Online:", data.userId);
      setOnlineStatus(data.userId, "online");
    };

    const onUserOffline = (data: { userId: string }) => {
      console.log("🌑 [GlobalNotification] User Offline:", data.userId);
      setOnlineStatus(data.userId, "offline", Date.now());
    };

    const onUserStatusResult = (data: { userId: string; status: string }) => {
      console.log("📊 [GlobalNotification] User Status Result:", data);
      setOnlineStatus(data.userId, data.status);
    };

    const onNewNotification = async (notif: any) => {
      console.log("🚀 [GlobalNotification] Received real-time notification:", notif);
      incrementUnreadNotifsCount();

      if (notifAudio.current) {
        notifAudio.current.currentTime = 0;
        notifAudio.current.play().catch((e) => {
          console.warn("🔔 [GlobalNotification] Notification sound play blocked:", e);
        });
      }

      // Dispatch custom event to notify components to refresh notifications list
      window.dispatchEvent(new CustomEvent("refresh_notifications"));

      let senderName = "Ai đó";
      if (notif.senderId) {
        const profile = await getUserProfile(notif.senderId);
        if (profile) {
          senderName = profile.fullName;
        }
      }

      toast.info(`${senderName} ${notif.message}`, {
        duration: 5000,
        action: {
          label: "Xem ngay",
          onClick: () => {
            if (notif.postId) {
              router.push(`/feed?postId=${notif.postId}`);
            }
          },
        },
      });
    };

    socketService.onMessageReceived(onMessage);
    socketService.onTyping(onTyping);
    socketService.onStopTyping(onStopTyping);
    socketService.onNewJoinRequest(onNewJoinRequest);
    socketService.onJoinRequestApproved(onJoinRequestApproved);
    socketService.onJoinRequestRejected(onJoinRequestRejected);
    socketService.onNewInvitation(onNewInvitation);
    socketService.onAddedToGroup(onAddedToGroup);
    socketService.onInvitationAccepted(onInvitationAccepted);
    socketService.onConversationRemoved(onConversationRemoved);
    socketService.onUserOnline(onUserOnline);
    socketService.onUserOffline(onUserOffline);
    socketService.onUserStatusResult(onUserStatusResult);
    const unsubscribeNewNotification = socketService.onNewNotification(onNewNotification);

    return () => {
      socketService.removeListener("message-received", onMessage);
      socketService.removeListener("TYPING", onTyping);
      socketService.removeListener("STOP_TYPING", onStopTyping);
      socketService.removeListener("NEW_JOIN_REQUEST", onNewJoinRequest);
      socketService.removeListener("JOIN_REQUEST_APPROVED", onJoinRequestApproved);
      socketService.removeListener("JOIN_REQUEST_REJECTED", onJoinRequestRejected);
      socketService.removeListener("NEW_INVITATION", onNewInvitation);
      socketService.removeListener("ADDED_TO_GROUP", onAddedToGroup);
      socketService.removeListener("INVITATION_ACCEPTED", onInvitationAccepted);
      socketService.removeListener("CONVERSATION_REMOVED", onConversationRemoved);
      socketService.removeListener("USER_ONLINE", onUserOnline);
      socketService.removeListener("USER_OFFLINE", onUserOffline);
      socketService.removeListener("USER_STATUS_RESULT", onUserStatusResult);
      unsubscribeNewNotification();
    };
  }, [currentUser, pathname, router, setTyping, incrementUnreadNotifsCount]);

  return null;
}
