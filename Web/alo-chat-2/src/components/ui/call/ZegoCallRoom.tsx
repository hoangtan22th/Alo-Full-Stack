// src/components/ui/call/ZegoCallRoom.tsx
"use client";
import React, { useEffect, useRef } from "react";
import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface Props {
  roomId: string;
  userId: string;
  userName: string;
  isGroup: boolean;
  isVideoCall?: boolean;
  onLeaveRoom: () => void;
  onUserJoin?: (users: any[]) => void;
  onUserLeave?: (users: any[]) => void;
  avatarMap?: Record<string, string>;
  myAvatar?: string;
  targetAvatar?: string;
  targetName?: string;
}

export default function ZegoCallRoom({
  roomId,
  userId,
  userName,
  isGroup,
  isVideoCall = true,
  onLeaveRoom,
  onUserJoin,
  onUserLeave,
  avatarMap = {},
  myAvatar,
  targetAvatar,
  targetName,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const callbacksRef = useRef({
    onLeaveRoom,
    onUserJoin,
    onUserLeave,
    avatarMap,
  });

  // Cập nhật ref để không bị stale closure
  useEffect(() => {
    callbacksRef.current = { onLeaveRoom, onUserJoin, onUserLeave, avatarMap };
  }, [onLeaveRoom, onUserJoin, onUserLeave, avatarMap]);

  // Chặn thông báo lỗi "createSpan" vô hại của Zego làm rác console
  useEffect(() => {
    const handler = (e: ErrorEvent) => {
      if (e.message?.includes("createSpan")) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    window.addEventListener("error", handler);
    return () => window.removeEventListener("error", handler);
  }, []);

  const participantsCount = useRef(1);

  useEffect(() => {
    let isMounted = true;
    let zp: any = null;

    const timer = setTimeout(() => {
      if (!isMounted || !containerRef.current) return;

      const appID = Number(
        process.env.NEXT_PUBLIC_ZEGO_APP_ID || import.meta.env.VITE_ZEGO_APP_ID,
      );
      const serverSecret =
        process.env.NEXT_PUBLIC_ZEGO_SERVER_SECRET ||
        import.meta.env.VITE_ZEGO_SERVER_SECRET;

      if (!appID || !serverSecret) {
        console.error(
          "Lỗi: Thiếu ZEGO_APP_ID hoặc ZEGO_SERVER_SECRET trong file .env",
        );
        return;
      }

      // Xử lý ID an toàn cho Zego (chỉ nhận chữ và số)
      const safeUserId = userId.replace(/[^a-zA-Z0-9_]/g, "") || "user_id";
      const safeRoomId = roomId.replace(/[^a-zA-Z0-9_]/g, "") || "room_id";

      const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
        appID,
        serverSecret,
        safeRoomId,
        safeUserId,
        userName,
      );

      zp = ZegoUIKitPrebuilt.create(kitToken);

      zp.joinRoom({
        container: containerRef.current,
        maxUsers: isGroup ? 50 : 2,
        scenario: {
          mode: isGroup
            ? ZegoUIKitPrebuilt.GroupCall
            : ZegoUIKitPrebuilt.OneONoneCall,
        },
        layout: "Auto",

        // Cấu hình giao diện chuẩn
        showPreJoinView: false,
        showLeaveRoomConfirmDialog: false, // Tắt popup hỏi "Bạn có chắc muốn rời khỏi?"

        // Điều khiển luồng Media
        turnOnMicrophoneWhenJoining: true,
        turnOnCameraWhenJoining: isVideoCall,
        showMyCameraToggleButton: isVideoCall,
        showMyMicrophoneToggleButton: true,
        showAudioVideoSettingsButton: true,
        showScreenSharingButton: isVideoCall,
        showTextChat: false,
        showUserList: isGroup,

        // Giữ lại Avatar Builder để khi tắt cam nhìn vẫn xịn
        showAvatarInAudioMode: true,
        showNonVideoUser: true,
        avatarBuilder: (userInfo: any) => {
          const fallback = `https://ui-avatars.com/api/?background=475569&color=fff&bold=true&name=${encodeURIComponent(userInfo.userName || "?")}`;
          let url = fallback;

          if (String(userInfo.userID) === String(safeUserId)) {
            url = myAvatar || fallback;
          } else if (!isGroup && targetAvatar) {
            url = targetAvatar;
          } else if (callbacksRef.current.avatarMap?.[userInfo.userID]) {
            url = callbacksRef.current.avatarMap[userInfo.userID];
          }

          const div = document.createElement("div");
          div.style.cssText =
            "width:100%;height:100%;border-radius:50%;overflow:hidden;box-shadow:0 4px 10px rgba(0,0,0,0.3);";
          const img = document.createElement("img");
          img.src = url;
          img.style.cssText = "width:100%;height:100%;object-fit:cover;";
          img.onerror = () => {
            img.src = fallback;
          };
          div.appendChild(img);
          return div;
        },

        // Bắt sự kiện người dùng
        onLeaveRoom: () => callbacksRef.current.onLeaveRoom(),
        onUserJoin: (users: any[]) => {
          participantsCount.current += users.length;
          callbacksRef.current.onUserJoin?.(users);
        },
        onUserLeave: (users: any[]) => {
          participantsCount.current -= users.length;
          if (!isGroup || participantsCount.current <= 1) {
            callbacksRef.current.onLeaveRoom(); // End call nếu còn 1 mình
          }
          callbacksRef.current.onUserLeave?.(users);
        },
      });
    }, 300); // Delay nhẹ 300ms để DOM kịp render

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (zp) {
        try {
          zp.destroy();
        } catch (e) {
          console.error(e);
        }
      }
    };
  }, [roomId, userId, userName, isGroup, isVideoCall, myAvatar, targetAvatar]);

  return (
    <div className="fixed inset-0 z-[9999] bg-[#1C1F2E] flex flex-col animate-in fade-in duration-300">
      {/* Nút thoát khẩn cấp an toàn góc trái trên cùng */}
      <button
        onClick={() => callbacksRef.current.onLeaveRoom()}
        className="absolute top-6 left-6 z-[10000] p-3 bg-red-500/80 hover:bg-red-600 text-white rounded-full transition-all shadow-lg active:scale-95"
        title="Đóng phòng gọi"
      >
        <XMarkIcon className="w-6 h-6" />
      </button>

      {/* Box chứa Zego - Full màn hình */}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
