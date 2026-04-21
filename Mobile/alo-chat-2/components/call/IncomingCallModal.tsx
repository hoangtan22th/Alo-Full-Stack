import React from 'react';
import { View, Text, Modal, TouchableOpacity, Image, StyleSheet, Dimensions } from 'react-native';
import { PhoneIcon, VideoCameraIcon, XMarkIcon } from 'react-native-heroicons/solid';

interface IncomingCallodalProps {
  incomingCall: {
    roomId: string;
    caller: {
      name: string;
      avatar?: string;
    };
    isVideo: boolean;
    isGroup?: boolean;
  } | null;
  onAccept: () => void;
  onDecline: () => void;
}

const { width } = Dimensions.get('window');

export default function IncomingCallModal({ incomingCall, onAccept, onDecline }: IncomingCallodalProps) {
  if (!incomingCall) return null;

  return (
    <Modal
      transparent
      animationType="slide"
      visible={true}
      onRequestClose={onDecline}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Cuộc gọi đến</Text>
          
          <View style={styles.callerInfo}>
            {incomingCall.caller.avatar ? (
              <Image source={{ uri: incomingCall.caller.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{incomingCall.caller.name?.charAt(0) || "?"}</Text>
              </View>
            )}
            <Text style={styles.callerName}>{incomingCall.caller.name}</Text>
            <Text style={styles.callType}>
              Đang mời bạn tham gia cuộc gọi {incomingCall.isVideo ? "video" : "thoại"} {incomingCall.isGroup && "nhóm"}
            </Text>
          </View>

          <View style={styles.actionContainer}>
            <TouchableOpacity style={[styles.actionButton, styles.declineButton]} onPress={onDecline}>
              <XMarkIcon fill="white" size={28} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionButton, styles.acceptButton]} onPress={onAccept}>
              {incomingCall.isVideo ? (
                <VideoCameraIcon fill="white" size={28} />
              ) : (
                <PhoneIcon fill="white" size={28} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 80,
  },
  container: {
    width: width * 0.9,
    backgroundColor: '#1F2937', 
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 20,
  },
  callerInfo: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#374151',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#4B5563',
  },
  avatarText: {
    color: '#F9FAFB',
    fontSize: 40,
    fontWeight: '300',
  },
  callerName: {
    color: '#F9FAFB',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  callType: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
    width: '100%',
  },
  actionButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  declineButton: {
    backgroundColor: '#EF4444',
  },
  acceptButton: {
    backgroundColor: '#10B981',
  },
});
