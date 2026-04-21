import { Ionicons } from "@expo/vector-icons";
import { Camera, CameraView } from "expo-camera";
import { useRouter } from "expo-router";
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import api from "../../../services/api";

export default function QrScannerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const scannedRef = useRef(false);

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    };

    getCameraPermissions();
  }, []);

  const handleBarCodeScanned = async ({
    type,
    data,
  }: {
    type: string;
    data: string;
  }) => {
    if (scannedRef.current) return;
    scannedRef.current = true;
    setScanned(true);

    // Validate that the QR code is from our login system
    // Expected format: alo-chat://login?token={qrToken}
    if (!data.startsWith("alo-chat://login?token=")) {
      Alert.alert(
        "Lỗi",
        "Mã QR không hợp lệ, vui lòng quét lại mã đăng nhập của Alo-Chat.",
        [
          {
            text: "Quét lại",
            onPress: () => {
              scannedRef.current = false;
              setScanned(false);
            },
          },
        ],
      );
      return;
    }

    const qrToken = data.split("token=")[1];
    if (!qrToken) {
      Alert.alert("Lỗi", "Mã QR đã hỏng hoặc không đúng định dạng.", [
        {
          text: "Quét lại",
          onPress: () => {
            scannedRef.current = false;
            setScanned(false);
          },
        },
      ]);
      return;
    }

    setLoading(true);
    try {
      // Send the token to the backend verify endpoint.
      // Note: `api.ts` must be passing the AccessToken implicitly via interceptors.
      await api.post("/auth/qr/verify", {
        qrToken: qrToken,
        deviceId: "Mobile-AloChat-App",
      });

      Alert.alert("Thành công", "Đăng nhập trên Web thành công!", [
        { text: "Đóng", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error(error);
      const msg =
        error.response?.data?.message ||
        "Đã có lỗi xảy ra hoặc mã QR đã hết hạn.";
      Alert.alert("Đăng nhập thất bại", msg, [
        {
          text: "Thử lại",
          onPress: () => {
            scannedRef.current = false;
            setScanned(false);
          },
        },
        { text: "Đóng", style: "cancel", onPress: () => router.back() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (hasPermission === null) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#000" />
        <Text className="mt-4">Đang yêu cầu quyền sử dụng camera...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View className="flex-1 bg-white items-center justify-center px-6">
        <Ionicons
          name="camera-outline"
          size={64}
          color="#ccc"
          className="mb-4"
        />
        <Text className="text-center text-lg mb-6">
          Xin lỗi, chúng tôi cần quyền truy cập camera để quét mã QR.
        </Text>
        <TouchableOpacity
          className="bg-black py-3 px-6 rounded-full"
          onPress={() => router.back()}
        >
          <Text className="text-white font-bold">Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <View
        style={{ paddingTop: insets.top, paddingHorizontal: 16, zIndex: 10 }}
        className="flex-row items-center py-4"
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 bg-white/20 rounded-full items-center justify-center"
        >
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-white flex-1 text-center text-lg font-bold mr-10">
          Quét mã QR trên Web
        </Text>
      </View>

      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      >
        {/* Overlay to create a "scanning frame" effect */}
        <View style={StyleSheet.absoluteFillObject} className="bg-black/50">
          <View className="flex-1" />
          <View className="flex-row">
            <View className="flex-1" />
            <View className="w-64 h-64 border-2 border-white bg-transparent rounded-2xl relative">
              {/* Corner markers */}
              <View className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-500 rounded-tl-xl -m-0.5" />
              <View className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-500 rounded-tr-xl -m-0.5" />
              <View className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-500 rounded-bl-xl -m-0.5" />
              <View className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-500 rounded-br-xl -m-0.5" />

              {loading && (
                <View className="absolute inset-0 items-center justify-center bg-black/60 rounded-2xl">
                  <ActivityIndicator size="large" color="#22c55e" />
                  <Text className="text-white font-bold mt-2">
                    Đang xác thực...
                  </Text>
                </View>
              )}
            </View>
            <View className="flex-1" />
          </View>
          <View className="flex-1 items-center pt-8">
            <Text className="text-white/80 text-center px-10 font-medium">
              Di chuyển camera đến khu vực mã QR trên màn hình máy tính để đăng
              nhập.
            </Text>
          </View>
        </View>
      </CameraView>
    </View>
  );
}
