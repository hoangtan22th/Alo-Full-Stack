"use client";

import {
  LiveKitRoom,
  RoomAudioRenderer,
  useTracks,
  useParticipants,
  VideoTrack,
  useLocalParticipant,
  useRoomContext,
} from '@livekit/components-react';
import { Track, RoomEvent, RemoteParticipant, DataPacket_Kind } from 'livekit-client';
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, MicOff, Video, VideoOff, PhoneOff, 
  UserPlus, Camera, Check, X, Maximize2, Minimize2
} from 'lucide-react';
import { toast } from 'sonner';
import { socketService } from '@/services/socketService';
import { useAuthStore } from '@/store/useAuthStore';

interface Props {
  roomId: string;
  userName: string;
  isVideoCall: boolean;
  onLeaveRoom: (duration?: number) => void;
  onUserJoin?: () => void;
  myAvatar?: string;
  targetName?: string;
  targetAvatar?: string;
  conversationMembers?: any[]; 
  isGroup: boolean;
}

export default function LiveKitCallRoom(props: Props) {
  const { roomId, userName, isVideoCall, onLeaveRoom } = props;
  const [token, setToken] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch(`/api/livekit?room=${roomId}&username=${encodeURIComponent(userName)}`);
        const data = await resp.json();
        if (data.token) {
          setToken(data.token);
        }
      } catch (e) {
        console.error("Error fetching LiveKit token:", e);
      }
    })();
  }, [roomId, userName]);

  if (token === "") {
    return (
      <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center text-white">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full"
        />
        <p className="mt-6 font-bold tracking-[0.2em] text-[10px] uppercase opacity-40">Securing Connection</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm font-sans text-white overflow-hidden flex items-center justify-center p-4 md:p-10">
      <LiveKitRoom
        video={isVideoCall}
        audio={true}
        token={token}
        serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
        onDisconnected={() => onLeaveRoom()}
        connect={true}
        className="h-full w-full max-w-6xl max-h-[850px] relative rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-white/10 bg-[#0a0a0a]"
      >
        <CallContent {...props} />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}

function CallContent({ roomId, onLeaveRoom, onUserJoin, targetName, targetAvatar, isVideoCall, conversationMembers, isGroup }: Props) {
  const { user: currentUser } = useAuthStore();
  const room = useRoomContext();
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(!isVideoCall);
  const [hasJoinedTriggered, setHasJoinedTriggered] = useState(false);
  
  // Duration tracking
  const startTimeRef = useRef<number | null>(null);
  const [duration, setDuration] = useState(0);

  // Video Upgrade state
  const [upgradeRequest, setUpgradeRequest] = useState<{from: string, identity: string} | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, name: 'camera' },
      { source: Track.Source.ScreenShare, name: 'screen_share' },
    ],
    { onlySubscribed: false },
  );

  // Duration Timer
  useEffect(() => {
    let interval: any;
    if (hasJoinedTriggered) {
      if (!startTimeRef.current) startTimeRef.current = Date.now();
      interval = setInterval(() => {
        setDuration(Math.floor((Date.now() - (startTimeRef.current || 0)) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [hasJoinedTriggered]);

  const formatDuration = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Auto-end call if everyone left
  useEffect(() => {
    if (participants.length > 1) {
      setHasJoinedTriggered(true);
    }
    
    if (hasJoinedTriggered && participants.length <= 1) {
      const finalDuration = startTimeRef.current ? Math.floor((Date.now() - startTimeRef.current) / 1000) : 0;
      onLeaveRoom(finalDuration);
    }
  }, [participants.length, hasJoinedTriggered, onLeaveRoom]);

  // Handle onUserJoin callback
  useEffect(() => {
    if (participants.length > 1 && onUserJoin) {
      onUserJoin();
    }
  }, [participants.length, onUserJoin]);

  // Listen for Data Signaling
  useEffect(() => {
    const onDataReceived = (payload: Uint8Array, participant?: RemoteParticipant) => {
      const decoder = new TextDecoder();
      const str = decoder.decode(payload);
      try {
        const data = JSON.parse(str);
        if (data.type === 'VIDEO_UPGRADE_REQUEST') {
          setUpgradeRequest({ from: participant?.name || participant?.identity || "Ai đó", identity: participant?.identity || "" });
        } else if (data.type === 'VIDEO_UPGRADE_ACCEPTED') {
          toast.success(`${participant?.name || "Đối phương"} đã bật camera`);
        }
      } catch (e) {}
    };

    room.on(RoomEvent.DataReceived, onDataReceived);
    return () => {
      room.off(RoomEvent.DataReceived, onDataReceived);
    };
  }, [room]);

  const toggleMic = () => {
    const enabled = !localParticipant.isMicrophoneEnabled;
    localParticipant.setMicrophoneEnabled(enabled);
    setIsMuted(!enabled);
  };

  const toggleCamera = async () => {
    const enabled = !localParticipant.isCameraEnabled;
    await localParticipant.setCameraEnabled(enabled);
    setIsCameraOff(!enabled);

    if (enabled && !isVideoCall) {
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify({ type: 'VIDEO_UPGRADE_REQUEST' }));
      room.localParticipant.publishData(data, { kind: DataPacket_Kind.RELIABLE });
      toast.info("Đã gửi yêu cầu bật camera tới mọi người");
    }
  };

  const acceptUpgrade = async () => {
    await localParticipant.setCameraEnabled(true);
    setIsCameraOff(false);
    setUpgradeRequest(null);
    
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify({ type: 'VIDEO_UPGRADE_ACCEPTED' }));
    room.localParticipant.publishData(data, { kind: DataPacket_Kind.RELIABLE });
  };

  const handleInvite = (memberId: string) => {
    socketService.initiateCall({
      targetRoom: roomId,
      caller: {
        id: currentUser?.id || currentUser?._id || "",
        name: currentUser?.fullName || "Tôi",
        avatar: currentUser?.avatar
      },
      isVideo: isVideoCall,
      inviteeIds: [memberId],
      isGroup: true
    });
    toast.success("Đã gửi lời mời tham gia");
  };

  const remoteTracks = tracks.filter(t => t.participant.identity !== localParticipant.identity);
  const localTrack = tracks.find(t => t.participant.identity === localParticipant.identity);

  return (
    <div className="relative h-full w-full flex flex-col">
      {/* Background Avatar Blur */}
      {targetAvatar && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <img 
            src={targetAvatar} 
            className="w-full h-full object-cover blur-[100px] scale-110 opacity-30" 
            alt="" 
          />
          <div className="absolute inset-0 bg-black/40" />
        </div>
      )}

      {/* Header */}
      <div className="absolute top-8 left-8 z-20 flex items-center gap-4">
        <div className="flex items-center gap-3 px-4 py-2 bg-white/5 backdrop-blur-2xl rounded-2xl border border-white/10">
          <div className={`w-2 h-2 rounded-full ${participants.length > 1 ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
          <div className="flex flex-col">
            <span className="text-[10px] font-black tracking-widest uppercase opacity-40 leading-none">
              {participants.length > 1 ? 'Secured Session' : 'Waiting for others'}
            </span>
            {hasJoinedTriggered && (
              <span className="text-xs font-mono font-bold mt-1">{formatDuration(duration)}</span>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex-1 relative flex items-center justify-center p-8 md:p-12">
        <AnimatePresence mode="wait">
          {remoteTracks.length > 0 ? (
            <motion.div 
              key="grid"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className={`w-full h-full grid gap-6 ${
                remoteTracks.length === 1 ? 'grid-cols-1' : 
                remoteTracks.length <= 4 ? 'grid-cols-2' : 'grid-cols-3'
              }`}
            >
              {remoteTracks.map((track) => (
                <div key={track.participant.sid} className="relative rounded-[2.5rem] overflow-hidden bg-white/5 border border-white/10 group shadow-2xl">
                  <VideoTrack trackRef={track} className="w-full h-full object-cover" />
                  <div className="absolute bottom-6 left-6 flex items-center gap-2">
                    <div className="px-4 py-2 bg-black/40 backdrop-blur-xl rounded-2xl text-[11px] font-bold border border-white/10">
                      {track.participant.name || track.participant.identity}
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.div key="waiting" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center">
              <div className="relative mb-10">
                <div className="absolute inset-0 bg-white/10 rounded-full animate-ping scale-150 duration-[4s]" />
                {targetAvatar ? (
                  <img src={targetAvatar} className="w-40 h-40 rounded-full border-4 border-white/10 object-cover relative z-10 shadow-2xl" alt="" />
                ) : (
                  <div className="w-40 h-40 rounded-full bg-white/5 border-4 border-white/10 flex items-center justify-center text-5xl font-light relative z-10 uppercase">
                    {targetName?.charAt(0) || "?"}
                  </div>
                )}
              </div>
              <h2 className="text-3xl font-black tracking-tight">{targetName || "Calling..."}</h2>
              <p className="text-[10px] opacity-30 mt-4 tracking-[0.3em] font-bold uppercase">Establishing Connection</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Local Preview */}
      <div className="absolute top-8 right-8 w-40 md:w-64 aspect-video rounded-3xl overflow-hidden border border-white/10 shadow-2xl z-20 bg-black/40 backdrop-blur-xl group">
        {localTrack && !isCameraOff ? (
          <VideoTrack trackRef={localTrack} className="w-full h-full object-cover mirror" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-white/5">
            <div className="flex flex-col items-center gap-2">
              <VideoOff size={24} className="opacity-20" />
              <span className="text-[8px] font-black uppercase opacity-20 tracking-widest">Camera Off</span>
            </div>
          </div>
        )}
        <div className="absolute top-3 left-3 px-3 py-1 bg-black/50 backdrop-blur-md rounded-xl text-[9px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity border border-white/10">
          You
        </div>
      </div>

      {/* Controls */}
      <div className="h-40 flex items-center justify-center px-8 relative z-20">
        <div className="flex items-center gap-4 px-8 py-5 bg-white/5 border border-white/10 backdrop-blur-3xl rounded-[3rem] shadow-2xl">
          <ControlButton active={!isMuted} onClick={toggleMic} icon={isMuted ? MicOff : Mic} />
          <ControlButton active={!isCameraOff} onClick={toggleCamera} icon={isCameraOff ? VideoOff : Video} />
          
          {isGroup && (
            <ControlButton active={showInviteModal} onClick={() => setShowInviteModal(true)} icon={UserPlus} />
          )}
          
          <div className="w-[1px] h-10 bg-white/10 mx-3" />
          
          <button 
            onClick={() => {
              const finalDuration = startTimeRef.current ? Math.floor((Date.now() - startTimeRef.current) / 1000) : 0;
              onLeaveRoom(finalDuration);
            }} 
            className="w-16 h-16 rounded-[2rem] bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all active:scale-90 shadow-2xl shadow-red-500/20"
          >
            <PhoneOff size={28} fill="currentColor" />
          </button>
        </div>
      </div>

      {/* Video Request Popup & Invite Modal - Keeping them standard but within room */}
      {/* ... (Same Modals as before but visually tweaked for room) ... */}
      <AnimatePresence>
        {upgradeRequest && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-48 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-4"
          >
            <div className="bg-white text-black p-6 rounded-[2.5rem] shadow-2xl flex flex-col items-center gap-5">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center"><Camera size={28} /></div>
              <div className="text-center">
                <p className="font-black text-base">{upgradeRequest.from} muốn bật video</p>
                <p className="text-[11px] opacity-50 mt-1 font-bold">Bạn có đồng ý bật camera của mình không?</p>
              </div>
              <div className="flex gap-3 w-full">
                <button onClick={() => setUpgradeRequest(null)} className="flex-1 py-4 rounded-2xl bg-gray-100 hover:bg-gray-200 font-black text-xs transition-colors uppercase tracking-widest">Bỏ qua</button>
                <button onClick={acceptUpgrade} className="flex-1 py-4 rounded-2xl bg-black text-white hover:bg-gray-800 font-black text-xs transition-colors flex items-center justify-center gap-2 uppercase tracking-widest">
                  <Check size={16} strokeWidth={3} /> Chấp nhận
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showInviteModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowInviteModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#151515] border border-white/10 w-full max-w-md rounded-[3rem] overflow-hidden relative z-10 shadow-2xl"
            >
              <div className="p-10">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-black tracking-tight">Thêm thành viên</h3>
                  <button onClick={() => setShowInviteModal(false)} className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"><X size={24} /></button>
                </div>
                
                <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                  {conversationMembers?.filter(m => String(m.userId) !== String(currentUser?.id || currentUser?._id)).map((member) => (
                    <div key={member.userId || member.id} className="flex items-center justify-between p-5 bg-white/5 rounded-3xl hover:bg-white/10 transition-colors group border border-transparent hover:border-white/5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-sm font-black uppercase overflow-hidden">
                          {member.avatar ? <img src={member.avatar} className="w-full h-full object-cover" /> : (member.fullName || member.displayName)?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-[14px] font-black">{member.fullName || member.displayName || member.name}</p>
                          <p className="text-[9px] opacity-30 uppercase tracking-[0.2em] font-bold">Available</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleInvite(member.userId)}
                        className="px-5 py-2.5 bg-white text-black text-[10px] font-black rounded-xl hover:bg-gray-200 transition-colors uppercase tracking-widest shadow-lg shadow-white/5"
                      >
                        Mời
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ControlButton({ active, onClick, icon: Icon }: { active: boolean, onClick: () => void, icon: any }) {
  return (
    <button 
      onClick={onClick}
      className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center transition-all active:scale-90 ${
        active 
          ? 'bg-white text-black hover:bg-gray-200 shadow-2xl shadow-white/10' 
          : 'bg-white/10 text-white hover:bg-white/20 border border-white/5'
      }`}
    >
      <Icon size={20} strokeWidth={2.5} />
    </button>
  );
}