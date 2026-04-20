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

  // Đếm số người trong phòng (kể cả bản thân)
  const participantCountRef = useRef(1); // bắt đầu với 1 (bản thân mình)

  // Cập nhật ref để tránh lỗi stale closure trong các callback của Zego
  useEffect(() => {
    callbacksRef.current = { onLeaveRoom, onUserJoin, onUserLeave, avatarMap };
  }, [onLeaveRoom, onUserJoin, onUserLeave, avatarMap]);

  // Chặn các lỗi vặt về DOM mà Zego đôi khi quăng ra console
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

  useEffect(() => {
    let isMounted = true;
    let zp: any = null;

    const timer = setTimeout(() => {
      if (!isMounted || !containerRef.current) return;

      // Lấy AppID và Secret từ biến môi trường
      const appID = Number(
        process.env.NEXT_PUBLIC_ZEGO_APP_ID || (import.meta as any).env?.VITE_ZEGO_APP_ID,
      );
      const serverSecret =
        process.env.NEXT_PUBLIC_ZEGO_SERVER_SECRET ||
        (import.meta as any).env?.VITE_ZEGO_SERVER_SECRET;

      if (!appID || !serverSecret) {
        console.error("Lỗi: Thiếu cấu hình ZegoCloud trong file .env");
        return;
      }

      // Format ID chỉ chứa chữ và số để Zego không bị lỗi kết nối
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
          // Tự động chọn kịch bản 1-1 hoặc Nhóm dựa trên prop isGroup
          mode: isGroup
            ? ZegoUIKitPrebuilt.GroupCall
            : ZegoUIKitPrebuilt.OneONoneCall,
        },
        layout: "Auto",

        // ═══ SỬ DỤNG GIAO DIỆN MẶC ĐỊNH ═══
        showPreJoinView: false, // Vào thẳng phòng không cần chờ
        showLeaveRoomConfirmDialog: false, // Bấm cúp máy là thoát luôn, không hỏi lại

        // Hiện đầy đủ các nút điều khiển mặc định của Zego
        turnOnMicrophoneWhenJoining: true,
        turnOnCameraWhenJoining: isVideoCall,
        showMyCameraToggleButton: true,
        showMyMicrophoneToggleButton: true,
        showAudioVideoSettingsButton: true,
        showScreenSharingButton: true,
        showTextChat: false, // Tắt chat của Zego vì đã có Alo Chat
        showUserList: isGroup,

        // Hiển thị Avatar khi tắt cam
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

        onLeaveRoom: () => callbacksRef.current.onLeaveRoom(),
        onUserJoin: (users: any[]) => {
          participantCountRef.current += users.length;
          callbacksRef.current.onUserJoin?.(users);
        },
        onUserLeave: (users: any[]) => {
          participantCountRef.current -= users.length;
          if (!isGroup) {
            // 1-1: người kia out => mình cũng out
            callbacksRef.current.onLeaveRoom();
          } else if (participantCountRef.current <= 1) {
            // Group: còn lại 1 mình => tự động thoát
            callbacksRef.current.onLeaveRoom();
          }
          callbacksRef.current.onUserLeave?.(users);
        },
      });
    }, 300);

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
      {/* Nút X thoát khẩn cấp phòng hờ lỗi treo trình duyệt */}
      <button
        onClick={() => callbacksRef.current.onLeaveRoom()}
        className="absolute top-6 left-6 z-[10000] p-3 bg-red-500/80 hover:bg-red-600 text-white rounded-full transition-all shadow-lg active:scale-95"
      >
        <XMarkIcon className="w-6 h-6" />
      </button>

      {/* Container chuẩn của Zego */}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
