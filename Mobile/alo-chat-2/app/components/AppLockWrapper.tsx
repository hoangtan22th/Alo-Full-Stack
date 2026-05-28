import React, { useEffect, useState, useRef } from 'react';
import { AppState, View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LockClosedIcon } from 'react-native-heroicons/outline';

interface AppLockWrapperProps {
  children: React.ReactNode;
}

export default function AppLockWrapper({ children }: AppLockWrapperProps) {
  const [isLocked, setIsLocked] = useState(false);
  const appState = useRef(AppState.currentState);
  const wentBackground = useRef(false);

  useEffect(() => {
    // Kéo trạng thái ban đầu của cài đặt lúc mới bật app
    checkInitialLock();

    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      const lockedSetting = await AsyncStorage.getItem('appLocked');
      
      if (nextAppState === 'background') {
        wentBackground.current = true;
        if (lockedSetting === 'true') {
          setIsLocked(true); // Che màn hình ngay khi app xuống background
        }
      }
      
      if (nextAppState === 'active') {
        if (wentBackground.current) {
          wentBackground.current = false;
          if (lockedSetting === 'true') {
            setIsLocked(true);
          }
        }
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const checkInitialLock = async () => {
    const lockedSetting = await AsyncStorage.getItem('appLocked');
    if (lockedSetting === 'true') {
      setIsLocked(true);
    }
  };

  const handleAuthenticate = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        setIsLocked(false);
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Xác thực để mở khóa ứng dụng',
        fallbackLabel: 'Dùng mật khẩu',
        cancelLabel: 'Hủy',
        disableDeviceFallback: false,
      });

      if (result.success) {
        setIsLocked(false);
      }
    } catch (e) {
      console.log('Lỗi xác thực', e);
    }
  };

  return (
    <View style={styles.container}>
      {children}
      
      {/* Lớp phủ màn hình khóa */}
      {isLocked && (
        <View style={styles.lockScreenContainer}>
          <LockClosedIcon size={64} color="#1f2937" style={{ marginBottom: 20 }} />
          <Text style={styles.lockText}>Ứng dụng đã bị khóa</Text>
          
          <TouchableOpacity style={styles.unlockButton} onPress={handleAuthenticate}>
            <Text style={styles.unlockButtonText}>Mở khóa ứng dụng</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  lockScreenContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  lockText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 40,
  },
  unlockButton: {
    backgroundColor: '#000',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 30,
  },
  unlockButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  }
});
