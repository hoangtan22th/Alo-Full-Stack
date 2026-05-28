import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ArrowLeftIcon } from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { contactService } from "../../../services/contactService";

export default function ScanQrScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.message}>
          Chúng tôi cần quyền sử dụng camera để quét mã QR
        </Text>
        <TouchableOpacity
          className="bg-black py-3 px-6 rounded-full mt-4"
          onPress={requestPermission}
        >
          <Text className="text-white font-semibold">Cấp quyền Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = async ({
    type,
    data,
  }: {
    type: string;
    data: string;
  }) => {
    setScanned(true);
    setLoading(true);

    try {
      const result = await contactService.searchUserByPhone(data);
      if (result) {
        router.replace({
          pathname: "/contacts/send-request",
          params: {
            userId: result.userId,
            fullName: result.fullName,
            phone: result.phone,
            avatarUrl: result.avatarUrl || "",
            relationStatus: result.relationStatus || "NOT_FRIEND",
          },
        });
      } else {
        Alert.alert("Thông báo", "Không tìm thấy người dùng với mã QR này", [
          { text: "Quét lại", onPress: () => setScanned(false) },
        ]);
      }
    } catch (error) {
      Alert.alert("Lỗi", "Đã xảy ra lỗi khi xử lý mã QR", [
        { text: "Quét lại", onPress: () => setScanned(false) },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
      />

      {/* Header trong suốt */}
      <View
        style={{ paddingTop: insets.top }}
        className="px-4 py-3 absolute top-0 left-0 right-0 flex-row items-center z-10"
      >
        <TouchableOpacity
          className="bg-black/50 p-2 rounded-full"
          onPress={() => router.back()}
        >
          <ArrowLeftIcon size={24} color="#fff" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-white ml-4 shadow-sm">
          Quét mã QR
        </Text>
      </View>

      {/* Overlay khung quét QR */}
      <View style={styles.overlay}>
        <View style={styles.topOverlay} />
        <View style={styles.middleRow}>
          <View style={styles.sideOverlay} />
          <View style={styles.scannerFrame}>
            <View style={[styles.corner, styles.topLeftCorner]} />
            <View style={[styles.corner, styles.topRightCorner]} />
            <View style={[styles.corner, styles.bottomLeftCorner]} />
            <View style={[styles.corner, styles.bottomRightCorner]} />
          </View>
          <View style={styles.sideOverlay} />
        </View>
        <View style={styles.bottomOverlay}>
          <Text className="text-white text-center mt-6 px-8 leading-6 bg-black/60 py-2 rounded-lg">
            Di chuyển thiết bị để mã QR vào vùng quét
          </Text>
          {loading && (
            <View className="mt-4 bg-black/60 p-4 rounded-xl flex-row items-center">
              <ActivityIndicator size="small" color="#fff" />
              <Text className="text-white ml-3">Đang tra cứu...</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const overlayColor = "rgba(0,0,0,0.6)";
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  message: {
    textAlign: "center",
    paddingBottom: 10,
    color: "#fff",
    fontSize: 16,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  topOverlay: {
    flex: 1,
    backgroundColor: overlayColor,
  },
  middleRow: {
    flexDirection: "row",
    height: 250,
  },
  sideOverlay: {
    flex: 1,
    backgroundColor: overlayColor,
  },
  scannerFrame: {
    width: 250,
    height: 250,
    backgroundColor: "transparent",
    position: "relative",
  },
  bottomOverlay: {
    flex: 1.5,
    backgroundColor: overlayColor,
    alignItems: "center",
  },
  corner: {
    position: "absolute",
    width: 30,
    height: 30,
    borderColor: "#3b82f6",
    borderWidth: 4,
  },
  topLeftCorner: {
    top: -2,
    left: -2,
    borderBottomWidth: 0,
    borderRightWidth: 0,
    borderTopLeftRadius: 12,
  },
  topRightCorner: {
    top: -2,
    right: -2,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopRightRadius: 12,
  },
  bottomLeftCorner: {
    bottom: -2,
    left: -2,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomLeftRadius: 12,
  },
  bottomRightCorner: {
    bottom: -2,
    right: -2,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomRightRadius: 12,
  },
});
