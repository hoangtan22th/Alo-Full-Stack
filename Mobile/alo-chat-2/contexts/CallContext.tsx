import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Vibration } from 'react-native';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import { messageService } from '../services/messageService';
import IncomingCallModal from '../components/call/IncomingCallModal';
import LiveKitCallRoom from '../components/call/LiveKitCallRoom';

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
  setCallEndedUi: (v: boolean) => void;
  callEndedUi: boolean;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error("useCall must be used within a CallProvider");
  }
  return context;
};

export function CallProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { socket } = useSocket();
  const myId = user?.id || user?._id || user?.userId;

  const [callState, setCallState] = useState<CallState>({ active: false, isVideo: false, hasSomeoneJoined: false });
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [callEndedUi, setCallEndedUi] = useState(false);

  // Fallback to vibration for ringtone since Audio API requires extra native modules on RN
  const playRingtone = useCallback(() => {
    // Vibrate repeatedly (1s vibrate, 2s pause)
    Vibration.vibrate([1000, 2000], true);
  }, []);

  const stopRingtone = useCallback(() => {
    Vibration.cancel();
  }, []);

  // Fail-safe: Always stop ringtone if no call is active or incoming, OR if call is connected
  useEffect(() => {
    if (!callState.active && !incomingCall) {
      stopRingtone();
    }
    if (callState.active && callState.hasSomeoneJoined) {
      stopRingtone();
    }
  }, [callState.active, callState.hasSomeoneJoined, incomingCall, stopRingtone]);

  useEffect(() => {
    if (!socket || !myId) return;

    const handleIncomingCall = (data: IncomingCall) => {
      if (callState.active || incomingCall) {
        socket.emit("CALL_BUSY", { targetRoom: data.roomId });
        messageService.sendMessage({
          conversationId: data.roomId,
          type: "system",
          content: data.isVideo ? "Cuộc gọi video nhỡ (Máy bận)" : "Cuộc gọi thoại nhỡ (Máy bận)",
          metadata: { 
            callType: data.isVideo ? 'video' : 'audio', 
            callStatus: 'canceled',
            callDuration: 0,
            isBusy: true
          }
        }).catch(()=>{});
        return;
      }

      if (data.caller.id !== String(myId)) {
        setIncomingCall(data);
        playRingtone();
      }
    };

    const handleCallCanceled = (data: { roomId: string }) => {
      setIncomingCall(prev => {
        if (prev?.roomId === data.roomId) {
          stopRingtone();
          return null;
        }
        return prev;
      });
    };

    const handleCallDeclined = (data: { roomId: string }) => {
      if (callState.roomId === data.roomId) {
        if (!callState.isGroup) {
          endCall();
        }
      }
    };

    const handleCallBusy = (data: { roomId: string }) => {
      if (callState.roomId === data.roomId) {
        if (!callState.isGroup) {
          endCall();
        }
      }
    };

    socket.on("INCOMING_CALL", handleIncomingCall);
    socket.on("CALL_CANCELED", handleCallCanceled);
    socket.on("CALL_DECLINED", handleCallDeclined);
    socket.on("CALL_BUSY", handleCallBusy);

    return () => {
      socket.off("INCOMING_CALL", handleIncomingCall);
      socket.off("CALL_CANCELED", handleCallCanceled);
      socket.off("CALL_DECLINED", handleCallDeclined);
      socket.off("CALL_BUSY", handleCallBusy);
    };
  }, [socket, myId, callState.active, callState.roomId, callState.isGroup, incomingCall, playRingtone, stopRingtone]);

  const startCall = (targetRoomId: string, isVideo: boolean, isGroup: boolean, targetName?: string, targetAvatar?: string, inviteeIds?: string[], members?: any[]) => {
    if (callState.active) {
      return;
    }

    setCallState({ active: true, isVideo, roomId: targetRoomId, isCaller: true, isGroup, hasSomeoneJoined: false, targetName, targetAvatar, members });

    if (socket) {
      socket.emit("CALL_INITIATED", {
        targetRoom: targetRoomId,
        caller: {
          id: String(myId),
          name: user?.fullName || "Tôi",
          avatar: user?.avatar
        },
        isVideo,
        inviteeIds,
        isGroup
      });
    }
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
    
    if (socket) {
      socket.emit("DECLINED_CALL", { targetRoom: incomingCall.roomId });
    }
    
    messageService.sendMessage({
      conversationId: incomingCall.roomId,
      type: "system",
      content: incomingCall.isVideo ? "Đã từ chối cuộc gọi video" : "Đã từ chối cuộc gọi thoại",
      metadata: { 
        callType: incomingCall.isVideo ? 'video' : 'audio', 
        callStatus: 'declined', 
        callDuration: 0 
      }
    }).catch(()=>{});

    setIncomingCall(null);
  };

  const endCall = (duration?: number) => {
    const currentRoomId = callState.roomId;
    if (currentRoomId && socket) {
      if (callState.isCaller) {
        socket.emit("CANCEL_CALL", { 
          targetRoom: currentRoomId,
          inviteeIds: callState.members?.map(m => m.userId)
        });
        
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
          }).catch(()=>{});
        }
      }

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
        }).catch(()=>{});
      }
    }

    stopRingtone();
    setCallState({ active: false, isVideo: false, hasSomeoneJoined: false });
    setCallEndedUi(false);
  };

  return (
    <CallContext.Provider value={{ callState, incomingCall, startCall, acceptCall, declineCall, endCall, callEndedUi, setCallEndedUi }}>
      {children}
      
      {/* Incoming Call Modal */}
      {incomingCall && !callState.active && (
        <IncomingCallModal 
          incomingCall={incomingCall}
          onAccept={acceptCall}
          onDecline={declineCall}
        />
      )}

      {/* LiveKit Call Room Overlay */}
      {callState.active && !callEndedUi && callState.roomId && (
        <LiveKitCallRoom
          roomId={callState.roomId}
          userName={user?.fullName || "Tôi"}
          isVideoCall={callState.isVideo}
          onLeaveRoom={(duration) => endCall(duration)}
          myAvatar={user?.avatar}
          targetName={callState.targetName || incomingCall?.caller?.name}
          targetAvatar={callState.targetAvatar || incomingCall?.caller?.avatar}
        />
      )}
    </CallContext.Provider>
  );
}
