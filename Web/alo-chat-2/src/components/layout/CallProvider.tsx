"use client";
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useAuthStore } from "@/store/useAuthStore";
import { socketService } from "@/services/socketService";
import { messageService } from "@/services/messageService";

const LiveKitCallRoom = dynamic(() => import("@/components/ui/call/LiveKitCallRoom"), { ssr: false });
import { PhoneIcon, VideoCameraIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import IncomingCallModal from "@/components/ui/call/IncomingCallModal";

interface CallState {
  active: boolean;
  isVideo: boolean;
  roomId?: string;
  isCaller?: boolean;
  isGroup?: boolean;
  hasSomeoneJoined?: boolean;
  targetName?: string;
  targetAvatar?: string;
  members?: any[];
}

interface IncomingCall {
  roomId: string;
  caller: {
    id: string;
    name: string;
    avatar?: string;
  };
  isVideo: boolean;
  isGroup?: boolean;
}

interface CallContextType {
  callState: CallState;
  incomingCall: IncomingCall | null;
  startCall: (targetRoomId: string, isVideo: boolean, isGroup: boolean, targetName?: string, targetAvatar?: string, inviteeIds?: string[], members?: any[]) => void;
  acceptCall: () => void;
  declineCall: () => void;
  endCall: (duration?: number) => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error("useCall must be used within a CallProvider");
  }
  return context;
};

export default function CallProvider({ children }: { children: React.ReactNode }) {
  const { user: currentUser } = useAuthStore();
  const myId = currentUser?.id || currentUser?._id || currentUser?.userId;

  const [callState, setCallState] = useState<CallState>({ active: false, isVideo: false, hasSomeoneJoined: false });
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [callEndedUi, setCallEndedUi] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  // Use Javascript Audio object for better control than <audio> tag
  const ringtoneInstance = useRef<HTMLAudioElement | null>(null);
  const callStateRef = useRef(callState);

  useEffect(() => {
    setIsMounted(true);
    // Khởi tạo audio object một lần duy nhất ở client
    if (typeof window !== "undefined") {
      ringtoneInstance.current = new Audio("/ringtone.mp3");
      ringtoneInstance.current.loop = true;
    }
    return () => {
      if (ringtoneInstance.current) {
        ringtoneInstance.current.pause();
        ringtoneInstance.current = null;
      }
    };
  }, []);

  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  // Fail-safe: Always stop ringtone if no call is active or incoming, OR if call is connected
  useEffect(() => {
    if (!callState.active && !incomingCall) {
      stopRingtone();
    }
    if (callState.active && callState.hasSomeoneJoined) {
      console.log("✅ [Call] Connected, stopping ringtone fail-safe");
      stopRingtone();
    }
  }, [callState.active, callState.hasSomeoneJoined, incomingCall]);

  const playRingtone = useCallback(() => {
    if (ringtoneInstance.current && ringtoneInstance.current.paused) {
      console.log("🔊 [Call] Playing ringtone...");
      ringtoneInstance.current.currentTime = 0;
      ringtoneInstance.current.muted = false;
      ringtoneInstance.current.volume = 1.0;
      ringtoneInstance.current.play().catch(e => console.log("Audio play blocked by browser:", e));
    }
  }, []);

  const stopRingtone = useCallback(() => {
    if (ringtoneInstance.current) {
      console.log("🔇 [Call] Stopping ringtone aggressively...");
      ringtoneInstance.current.pause();
      ringtoneInstance.current.currentTime = 0;
      ringtoneInstance.current.muted = true;
      ringtoneInstance.current.volume = 0;
    }
  }, []);

  // Listen for socket events
  useEffect(() => {
    if (!myId) return;

    const handleIncomingCall = (data: IncomingCall) => {
      // 1. Busy Logic: Nếu đang trong cuộc gọi khác
      if (callStateRef.current.active || incomingCall) {
        console.log("☎️ [Call] System is busy, emitting CALL_BUSY");
        socketService.emitCallBusy({ targetRoom: data.roomId });
        
        // Tạo tin nhắn "Cuộc gọi nhỡ" (bận) cho mình
        messageService.sendMessage({
          conversationId: data.roomId,
          type: "system",
          content: data.isVideo ? "Cuộc gọi video nhỡ (Máy bận)" : "Cuộc gọi thoại nhỡ (Máy bận)",
          metadata: { 
            callType: data.isVideo ? 'video' : 'audio', 
            callStatus: 'canceled', // Canceled mapped to Missed Call in UI
            callDuration: 0,
            isBusy: true
          }
        });
        return;
      }

      // 2. Hiện cuộc gọi đến
      if (data.caller.id !== String(myId)) {
        setIncomingCall(data);
        playRingtone();
      }
    };

    const handleCallCanceled = (data: { roomId: string }) => {
      // Nếu mình đang rung chuông mà họ hủy -> Tắt rung
      if (incomingCall?.roomId === data.roomId) {
        setIncomingCall(null);
        stopRingtone();
        toast.info("Cuộc gọi đã bị hủy");
      }
    };

    const handleCallDeclined = (data: { roomId: string }) => {
      if (callStateRef.current.roomId === data.roomId) {
        toast.error("Đối phương đã từ chối cuộc gọi");
        if (!callStateRef.current.isGroup) {
          endCall();
        }
      }
    };

    const handleCallBusy = (data: { roomId: string }) => {
      if (callStateRef.current.roomId === data.roomId) {
        toast.error("Đối phương đang bận");
        if (!callStateRef.current.isGroup) {
          endCall();
        }
      }
    };

    socketService.onIncomingCall(handleIncomingCall);
    socketService.onCallCanceled(handleCallCanceled);
    socketService.onCallDeclined(handleCallDeclined);
    socketService.onCallBusy(handleCallBusy);

    return () => {
      socketService.removeListener("INCOMING_CALL", handleIncomingCall);
      socketService.removeListener("CALL_CANCELED", handleCallCanceled);
      socketService.removeListener("CALL_DECLINED", handleCallDeclined);
      socketService.removeListener("CALL_BUSY", handleCallBusy);
    };
  }, [myId, incomingCall, playRingtone, stopRingtone]);

  const startCall = (targetRoomId: string, isVideo: boolean, isGroup: boolean, targetName?: string, targetAvatar?: string, inviteeIds?: string[], members?: any[]) => {
    if (callState.active) {
      toast.error("Bạn đang trong một cuộc gọi khác");
      return;
    }

    setCallState({ active: true, isVideo, roomId: targetRoomId, isCaller: true, isGroup, hasSomeoneJoined: false, targetName, targetAvatar, members });
    playRingtone();

    socketService.initiateCall({
      targetRoom: targetRoomId,
      caller: {
        id: myId as string,
        name: currentUser?.fullName || "Tôi",
        avatar: currentUser?.avatar
      },
      isVideo,
      inviteeIds,
      isGroup
    });
  };

  const acceptCall = () => {
    if (!incomingCall) return;
    stopRingtone();
    setCallState({ 
      active: true, 
      isVideo: incomingCall.isVideo, 
      roomId: incomingCall.roomId, 
      isCaller: false, 
      isGroup: incomingCall.isGroup || false,
      hasSomeoneJoined: true,
      targetName: incomingCall.caller?.name,
      targetAvatar: incomingCall.caller?.avatar
    });
    setIncomingCall(null);
  };

  const declineCall = () => {
    if (!incomingCall) return;
    stopRingtone();
    socketService.declinedCall({ targetRoom: incomingCall.roomId });
    
    // Lưu tin nhắn gọi nhỡ
    messageService.sendMessage({
      conversationId: incomingCall.roomId,
      type: "system",
      content: incomingCall.isVideo ? "Đã từ chối cuộc gọi video" : "Đã từ chối cuộc gọi thoại",
      metadata: { 
        callType: incomingCall.isVideo ? 'video' : 'audio', 
        callStatus: 'declined', 
        callDuration: 0 
      }
    });

    setIncomingCall(null);
  };

  const endCall = (duration?: number) => {
    const currentRoomId = callState.roomId;
    if (currentRoomId) {
      // Chỉ gửi CANCEL_CALL nếu là người gọi
      if (callState.isCaller) {
        socketService.cancelCall({ 
          targetRoom: currentRoomId,
          inviteeIds: callState.members?.map(m => m.userId)
        });
        
        // Nếu chưa ai bắt máy -> Lưu tin nhắn gọi nhỡ
        if (!callState.hasSomeoneJoined) {
          messageService.sendMessage({
            conversationId: currentRoomId,
            type: "system",
            content: callState.isVideo ? "Cuộc gọi video nhỡ" : "Cuộc gọi thoại nhỡ",
            metadata: { 
              callType: callState.isVideo ? 'video' : 'audio', 
              callStatus: 'canceled', 
              callDuration: 0 
            }
          });
        }
      }

      // Nếu cuộc gọi đã kết thúc và có thời lượng -> Lưu tin nhắn kết thúc
      if (callState.hasSomeoneJoined && duration !== undefined) {
        const mins = Math.floor(duration / 60);
        const secs = duration % 60;
        const durationStr = mins > 0 ? `${mins} phút ${secs} giây` : `${secs} giây`;
        
        messageService.sendMessage({
          conversationId: currentRoomId,
          type: "system",
          content: `Cuộc gọi ${callState.isVideo ? 'video' : 'thoại'} kết thúc • ${durationStr}`,
          metadata: { 
            callType: callState.isVideo ? 'video' : 'audio', 
            callStatus: 'ended', 
            callDuration: duration 
          }
        });
      }
    }
    stopRingtone();
    setCallState({ active: false, isVideo: false, hasSomeoneJoined: false });
    setCallEndedUi(false);
  };

  const handleUserJoined = useCallback(() => {
    console.log("👥 [Call] User joined, stopping ringtone");
    setCallState(prev => ({ ...prev, hasSomeoneJoined: true }));
    stopRingtone();
  }, [stopRingtone]);

  return (
    <CallContext.Provider value={{ callState, incomingCall, startCall, acceptCall, declineCall, endCall }}>
      {children}
      
      {isMounted && (
        <>
          {/* Incoming Call Modal */}
          {incomingCall && !callState.active && (
            <IncomingCallModal 
              incomingCall={incomingCall}
              onAccept={acceptCall}
              onDecline={declineCall}
            />
          )}

          {/* LiveKit Call Room */}
          {callState.active && !callEndedUi && callState.roomId && (
            <LiveKitCallRoom
              roomId={callState.roomId}
              userName={currentUser?.fullName || "Tôi"}
              isVideoCall={callState.isVideo}
              onLeaveRoom={(duration) => endCall(duration)}
              onUserJoin={handleUserJoined}
              myAvatar={currentUser?.avatar}
              targetName={callState.targetName || incomingCall?.caller?.name}
              targetAvatar={callState.targetAvatar || incomingCall?.caller?.avatar}
              conversationMembers={callState.members}
              isGroup={callState.isGroup || false}
            />
          )}
        </>
      )}
    </CallContext.Provider>
  );
}
