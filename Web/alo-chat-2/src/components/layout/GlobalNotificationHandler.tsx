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

    const onInvitationAccepted = (data: any) => {
      console.log("🔔 [GlobalNotification] Invitation Accepted:", data);
      toast.success(`Lời mời được chấp nhận`, {
        description: `${data.accepterName} đã chấp nhận lời mời vào nhóm ${data.groupName}`,
        duration: 5000,
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
    };
  }, [currentUser, pathname, router, setTyping]);

  return null;
}
