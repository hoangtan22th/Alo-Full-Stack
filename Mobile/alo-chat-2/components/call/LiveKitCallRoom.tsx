import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { LiveKitRoom, useRoomContext, VideoView, useLocalParticipant, useTracks, useParticipants } from '@livekit/react-native';
import { Track, setLogLevel, LogLevel } from 'livekit-client';

// Disable internal LiveKit logs that crash Metro Console via Babel wrapNativeSuper on video tracks
setLogLevel(LogLevel.silent);
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

const { width } = Dimensions.get('window');

interface LiveKitCallRoomProps {
  roomId: string;
  userName: string;
  isVideoCall: boolean;
  onLeaveRoom: (duration?: number) => void;
  myAvatar?: string;
  targetName?: string;
  targetAvatar?: string;
}

export default function LiveKitCallRoom(props: LiveKitCallRoomProps) {
  const { roomId, userName, isVideoCall, onLeaveRoom, targetName } = props;
  const [token, setToken] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const ip = process.env.EXPO_PUBLIC_IP_ADDRESS || "192.168.1.69";
        const url = `http://${ip}:3001/api/livekit?room=${roomId}&username=${encodeURIComponent(userName)}`;
        // Call Next.js API running on port 3001 to get LiveKit token
        const resp = await fetch(url);
        
        const text = await resp.text();
        try {
          const data = JSON.parse(text);
          if (data.token) {
            setToken(data.token);
          } else {
            console.error("No token in JSON response:", data);
          }
        } catch (jsonErr) {
          console.error(`Invalid JSON from ${url}. Status HTTP ${resp.status}. Response text:`, text.substring(0, 500));
        }
      } catch (e) {
        console.error("Network Error fetching LiveKit token:", e);
      }
    })();
  }, [roomId, userName]);

  if (!token) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Đang kết nối bảo mật...</Text>
      </View>
    );
  }

  const livekitUrl = process.env.EXPO_PUBLIC_LIVEKIT_URL || "wss://alo-chat-1qslw46c.livekit.cloud";

  return (
    <View style={styles.container}>
      <LiveKitRoom
        serverUrl={livekitUrl}
        token={token}
        connect={true}
        audio={true}
        video={isVideoCall}
        onDisconnected={() => onLeaveRoom()}
      >
        <CallContent {...props} />
      </LiveKitRoom>
    </View>
  );
}

function CallContent({ isVideoCall, onLeaveRoom, targetName }: LiveKitCallRoomProps) {
  const room = useRoomContext();
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(!isVideoCall);
  
  // All tracks
  const tracks = useTracks([Track.Source.Camera]);
  // Filter remote tracks
  const remoteTracks = tracks.filter(t => t.participant.identity !== localParticipant.identity);
  const localCameraTrack = tracks.find(t => t.participant.identity === localParticipant.identity);
  
  const toggleMic = () => {
    const enabled = !localParticipant.isMicrophoneEnabled;
    localParticipant.setMicrophoneEnabled(enabled);
    setIsMuted(!enabled);
  };

  const toggleCamera = () => {
    const enabled = !localParticipant.isCameraEnabled;
    localParticipant.setCameraEnabled(enabled);
    setIsCameraOff(!enabled);
  };

  // We can render the first remote track
  const activeRemoteTrack = remoteTracks.length > 0 ? remoteTracks[0] : null;

  return (
    <View style={styles.contentContainer}>
      <View style={styles.remoteVideoContainer}>
        {activeRemoteTrack && activeRemoteTrack.publication?.videoTrack ? (
           <VideoView videoTrack={activeRemoteTrack.publication.videoTrack} style={styles.fullScreenVideo} objectFit="cover" />
        ) : (
          <View style={styles.avatarPlaceholder}>
             <Text style={styles.avatarText}>{targetName?.charAt(0) || "U"}</Text>
             <Text style={styles.statusText}>{participants.length > 1 ? "Đang gọi thoại..." : "Đang kết nối..."}</Text>
          </View>
        )}
      </View>

      {!isCameraOff && localCameraTrack?.publication?.videoTrack && (
        <View style={styles.localVideoContainer}>
           <VideoView videoTrack={localCameraTrack.publication.videoTrack as any} style={styles.localVideo} objectFit="cover" mirror={true} />
        </View>
      )}

      <View style={styles.controlsContainer}>
        <TouchableOpacity style={[styles.controlBtn, isMuted && styles.controlBtnOff]} onPress={toggleMic}>
           <MaterialIcons name={isMuted ? "mic-off" : "mic"} size={28} color={isMuted ? "white" : "black"} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.endCallBtn} onPress={() => onLeaveRoom()}>
           <MaterialIcons name="call-end" size={36} color="white" />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.controlBtn, isCameraOff && styles.controlBtnOff]} onPress={toggleCamera}>
           <MaterialIcons name={isCameraOff ? "videocam-off" : "videocam"} size={28} color={isCameraOff ? "white" : "black"} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  loadingText: {
    color: '#9CA3AF',
    marginTop: 16,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 9999,
  },
  contentContainer: {
    flex: 1,
  },
  remoteVideoContainer: {
    flex: 1,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenVideo: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 72,
    color: '#374151',
    fontWeight: 'bold',
  },
  statusText: {
    marginTop: 24,
    color: '#9CA3AF',
    fontSize: 16,
  },
  localVideoContainer: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 100,
    height: 150,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  localVideo: {
    width: '100%',
    height: '100%',
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 140,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    paddingBottom: 30,
  },
  controlBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlBtnOff: {
    backgroundColor: '#374151',
  },
  endCallBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
});
