"use client";
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useAuthStore } from "@/store/useAuthStore";
import { socketService } from "@/services/socketService";
import { messageService } from "@/services/messageService";

const ZegoCallRoom = dynamic(() => import("@/components/ui/call/ZegoCallRoom"), { ssr: false });
import { PhoneIcon, VideoCameraIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";

interface CallState {
  active: boolean;
  isVideo: boolean;
  roomId?: string;
  isCaller?: boolean;
  isGroup?: boolean;
  hasSomeoneJoined?: boolean;
}

interface IncomingCall {
  roomId: string;
  caller: {
    id: string;
    name: string;
    avatar?: string;
  };
  isVideo: boolean;
}

interface CallContextType {
  callState: CallState;
  incomingCall: IncomingCall | null;
  startCall: (targetRoomId: string, isVideo: boolean, isGroup: boolean) => void;
  acceptCall: () => void;
  declineCall: () => void;
  endCall: () => void;
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
      if (incomingCall?.roomId === data.roomId) {
        setIncomingCall(null);
        stopRingtone();
        toast.info("Cuộc gọi đã bị hủy");
      }
    };

    const handleCallDeclined = (data: { roomId: string }) => {
      if (callStateRef.current.roomId === data.roomId) {
        toast.error("Đối phương đã từ chối cuộc gọi");
        endCall();
      }
    };

    const handleCallBusy = (data: { roomId: string }) => {
      if (callStateRef.current.roomId === data.roomId) {
        toast.error("Đối phương đang bận");
        endCall();
      }
    };

    socketService.onIncomingCall(handleIncomingCall);
    socketService.onCallCanceled(handleCallCanceled);
    socketService.onCallDeclined(handleCallDeclined);
    socketService.onCallBusy(handleCallBusy);

    return () => {
      socketService.off("INCOMING_CALL");
      socketService.off("CALL_CANCELED");
      socketService.off("CALL_DECLINED");
      socketService.off("CALL_BUSY");
    };
  }, [myId, incomingCall, playRingtone, stopRingtone]);

  const startCall = (targetRoomId: string, isVideo: boolean, isGroup: boolean) => {
    if (callState.active) {
      toast.error("Bạn đang trong một cuộc gọi khác");
      return;
    }

    setCallState({ active: true, isVideo, roomId: targetRoomId, isCaller: true, isGroup, hasSomeoneJoined: false });
    playRingtone();

    socketService.initiateCall({
      targetRoom: targetRoomId,
      caller: {
        id: myId as string,
        name: currentUser?.fullName || "Tôi",
        avatar: currentUser?.avatar
      },
      isVideo
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
      isGroup: false, // 1-1 call by default for incoming
      hasSomeoneJoined: true 
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

  const endCall = () => {
    const currentRoomId = callState.roomId;
    if (currentRoomId) {
      socketService.cancelCall({ targetRoom: currentRoomId });
    }
    stopRingtone();
    setCallState({ active: false, isVideo: false, hasSomeoneJoined: false });
    setCallEndedUi(false);
  };

  return (
    <CallContext.Provider value={{ callState, incomingCall, startCall, acceptCall, declineCall, endCall }}>
      {children}
      
      {isMounted && (
        <>
          {/* Incoming Call Modal */}
          {incomingCall && !callState.active && (
            <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
              <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden flex flex-col items-center p-8 relative animate-in zoom-in-95 duration-300">
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-blue-50 to-transparent"></div>
                
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-20"></div>
                  {incomingCall.caller?.avatar ? (
                    <img src={incomingCall.caller.avatar} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg relative z-10" />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-white shadow-lg relative z-10">
                      {(incomingCall.caller?.name || "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <h3 className="text-xl font-black text-gray-900 mb-1 z-10">{incomingCall.caller?.name || "Ai đó"}</h3>
                <p className="text-blue-600 font-bold text-sm animate-pulse z-10 mb-8">
                  Đang gọi {incomingCall.isVideo ? "Video" : "Thoại"} cho bạn...
                </p>

                <div className="flex items-center gap-12 z-10">
                  <button 
                    onClick={declineCall}
                    className="flex flex-col items-center gap-3 group"
                  >
                    <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-200 group-hover:bg-red-600 group-active:scale-90 transition-all">
                      <XMarkIcon className="w-8 h-8" strokeWidth={2.5} />
                    </div>
                    <span className="text-xs font-bold text-gray-500">Từ chối</span>
                  </button>

                  <button 
                    onClick={acceptCall}
                    className="flex flex-col items-center gap-3 group"
                  >
                    <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center text-white shadow-lg shadow-green-200 group-hover:bg-green-600 group-active:scale-90 transition-all animate-bounce">
                      {incomingCall.isVideo ? <VideoCameraIcon className="w-8 h-8"/> : <PhoneIcon className="w-8 h-8"/>}
                    </div>
                    <span className="text-xs font-bold text-gray-500">Trả lời</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Zego Call Room */}
          {callState.active && !callEndedUi && callState.roomId && (
            <ZegoCallRoom
              roomId={callState.roomId}
              userId={myId || "unknown"}
              userName={currentUser?.fullName || "Tôi"}
              isVideoCall={callState.isVideo}
              isGroup={callState.isGroup || false}
              onLeaveRoom={() => endCall()}
              onUserJoin={() => {
                console.log("👥 [Call] User joined, stopping ringtone");
                setCallState(prev => ({ ...prev, hasSomeoneJoined: true }));
                stopRingtone();
              }}
              myAvatar={currentUser?.avatar}
              targetName={incomingCall?.caller?.name}
              targetAvatar={incomingCall?.caller?.avatar}
            />
          )}
        </>
      )}
    </CallContext.Provider>
  );
}
