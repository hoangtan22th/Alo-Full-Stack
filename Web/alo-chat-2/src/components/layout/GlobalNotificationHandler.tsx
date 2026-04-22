"use client";
import { useEffect, useRef } from "react";
import { socketService } from "@/services/socketService";
import { useChatStore } from "@/store/useChatStore";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";
import { contactService } from "@/services/contactService";
import { groupService } from "@/services/groupService";
import { useRouter, usePathname } from "next/navigation";

export default function GlobalNotificationHandler() {
  const { setTyping, typingUsers, friendIds, setFriendIds } = useChatStore();
  const { user: currentUser } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

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

  useEffect(() => {
    if (typeof window !== "undefined") {
      receiveAudio.current = new Audio("/audio_nhan.MP3");
      typingAudio.current = new Audio("/audio_soan.MP3");
      typingAudio.current.loop = true;
    }

    return () => {
      receiveAudio.current?.pause();
      typingAudio.current?.pause();
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

      // Play sound
      if (receiveAudio.current) {
        console.log("🔊 [GlobalNotification] Playing receive sound...");
        receiveAudio.current.currentTime = 0;
        receiveAudio.current.play().catch((e) => console.error("❌ [GlobalNotification] Sound blocked:", e));
      }

      const msgConvoId = String(msg.conversationId || msg.roomId || "");
      
      // Extract ID precisely from /chat/[id]
      const pathParts = pathname?.split("/").filter(Boolean) || [];
      const currentConvoId = (pathParts[0] === "chat" && pathParts[1]) ? pathParts[1] : null;
      
      console.log(`🔍 [GlobalNotification] Comparing: ActiveRoom=${currentConvoId}, IncomingMsgRoom=${msgConvoId}`);

      if (currentConvoId !== msgConvoId) {
        // If it's a group, it's NOT a stranger conversation
        const isStranger = !msg.isGroup && !friendIds.has(String(msg.senderId)) && String(msg.senderId) !== "alo-bot";
        
        console.log("🔔 [GlobalNotification] Conditions met. Showing toast...", { isStranger });
        
        if (isStranger) {
          // Auto-categorize as stranger to hide from main list
          groupService.updateConversationFolder(msgConvoId, "stranger").catch(console.error);
          
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
            description: msg.content || (msg.type === "image" ? "[Hình ảnh]" : "Đã gửi một tệp tin"),
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

    socketService.onMessageReceived(onMessage);
    socketService.onTyping(onTyping);
    socketService.onStopTyping(onStopTyping);

    return () => {
      socketService.removeListener("message-received", onMessage);
      socketService.removeListener("TYPING", onTyping);
      socketService.removeListener("STOP_TYPING", onStopTyping);
    };
  }, [currentUser, pathname, router, setTyping]);

  return null;
}
