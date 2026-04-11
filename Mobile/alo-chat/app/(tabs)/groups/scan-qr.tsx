import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Alert, TouchableOpacity } from "react-native";
import { Camera, CameraView } from "expo-camera";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeftIcon } from "react-native-heroicons/outline";
import { groupService } from "../../../services/groupService";

export default function ScanQRScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  const handleBarCodeScanned = async ({
    type,
    data,
  }: {
    type: string;
    data: string;
  }) => {
    setScanned(true);

    try {
      // Expecting URL like https://alo.chat/g/{groupId}
      const match = data.match(/https:\/\/alo\.chat\/g\/([a-zA-Z0-9_-]+)/);

      if (!match) {
        Alert.alert(
          "Mã QR không hợp lệ",
          "Đây không phải là mã QR tham gia nhóm của Alo.",
          [{ text: "Quét lại", onPress: () => setScanned(false) }],
        );
        return;
      }

      const groupId = match[1];

      // Call API
      const res = await groupService.requestJoinGroup(groupId);

      let resData = res;
      if (res?.data) resData = res.data;

      if (resData?.joined) {
        const groupInfo = resData?.data;
        const groupName = groupInfo?.name || "Nhóm";
        const groupAvatar = groupInfo?.groupAvatar || "";
        const mCount = groupInfo?.members?.length || 1;

        const navigateToChat = () => {
          router.back(); // Trở về danh sách nhóm
          setTimeout(() => {
            router.push({
              pathname: `/chat/${groupId}` as any,
              params: {
                name: groupName,
                avatar: groupAvatar,
                membersCount: mCount,
              },
            });
          }, 300); // Thêm delay nhỏ để tránh đụng độ animation chuyển cảnh
        };

        if (resData?.alreadyMember) {
          // Nếu đã là thành viên, chuyển hướng đến group ngay
          navigateToChat();
        } else {
          Alert.alert("Thành công", "Đã tham gia nhóm thành công!", [
            {
              text: "Vào nhóm",
              onPress: navigateToChat,
            },
          ]);
        }
      } else {
        Alert.alert(
          "Yêu cầu đã gửi",
          "Nhóm yêu cầu phê duyệt để tham gia. Vui lòng chờ Quản trị viên duyệt nhóm.",
          [{ text: "Xong", onPress: () => router.back() }],
        );
      }
    } catch (error: any) {
      const errorMsg =
        error?.response?.data?.error || "Không thể tham gia nhóm";
      Alert.alert("Lỗi", errorMsg, [
        { text: "Quét lại", onPress: () => setScanned(false) },
        { text: "Huỷ", onPress: () => router.back() },
      ]);
    }
  };

  if (hasPermission === null) {
    return (
      <View className="flex-1 bg-black justify-center items-center">
        <Text className="text-white">Yêu cầu quyền truy cập Camera...</Text>
      </View>
    );
  }
  if (hasPermission === false) {
    return (
      <View className="flex-1 bg-black justify-center items-center">
        <Text className="text-white">Không có quyền truy cập camera</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView
        style={StyleSheet.absoluteFillObject}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
      />

      {/* Overlay & Thùng quét (Scanner Frame) */}
      <View style={StyleSheet.absoluteFillObject} className="z-10">
        {/* Top Mask với Header */}
        <View className="flex-1 bg-black/60">
          <View
            style={{ paddingTop: insets.top }}
            className="px-4 py-3 flex-row items-center mt-2"
          >
            <TouchableOpacity
              onPress={() => router.back()}
              className="p-2 bg-white/20 rounded-full"
            >
              <ArrowLeftIcon size={24} color="#FFF" />
            </TouchableOpacity>
            <Text className="text-white text-xl font-bold ml-4">
              Quét mã QR
            </Text>
          </View>
        </View>

        {/* Khu vực Center */}
        <View className="flex-row h-[280px]">
          <View className="flex-1 bg-black/60" />
          <View className="w-[280px] h-[280px] relative">
            {/* 4 Góc bo tròn báo hiệu vùng quét */}
            <View className="absolute top-0 left-0 w-12 h-12 border-t-[5px] border-l-[5px] border-[#10b981] rounded-tl-[16px]" />
            <View className="absolute top-0 right-0 w-12 h-12 border-t-[5px] border-r-[5px] border-[#10b981] rounded-tr-[16px]" />
            <View className="absolute bottom-0 left-0 w-12 h-12 border-b-[5px] border-l-[5px] border-[#10b981] rounded-bl-[16px]" />
            <View className="absolute bottom-0 right-0 w-12 h-12 border-b-[5px] border-r-[5px] border-[#10b981] rounded-br-[16px]" />
            {/* Viền mờ nguyên ô vuông */}
            <View className="w-full h-full border border-white/20 rounded-[16px]" />
          </View>
          <View className="flex-1 bg-black/60" />
        </View>

        {/* Bottom Mask */}
        <View className="flex-1 bg-black/60 items-center justify-center pb-[100px]">
          <Text className="text-white text-[15px] font-medium text-center px-10">
            Hướng camera vào khu vực này để quét mã QR tham gia nhóm
          </Text>
        </View>
      </View>
    </View>
  );
}
