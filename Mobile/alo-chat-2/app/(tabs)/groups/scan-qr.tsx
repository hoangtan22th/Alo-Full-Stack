import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Alert, TouchableOpacity } from "react-native";
import { Camera, CameraView } from "expo-camera";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeftIcon } from "react-native-heroicons/outline";
import { groupService } from "../../../services/groupService";
import { useAuth } from "../../../contexts/AuthContext";

export default function ScanQRScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const scannedRef = React.useRef(false);
  const { user } = useAuth();
  const currentUserId = user?.id || user?._id || user?.userId || null;

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
    if (scannedRef.current) return;
    scannedRef.current = true;
    setScanned(true);

    try {
      // Expecting URL like https://alo.chat/g/{groupId}
      const match = data.match(/https:\/\/alo\.chat\/g\/([a-zA-Z0-9_-]+)/);

      if (!match) {
        Alert.alert(
          "Mã QR không hợp lệ",
          "Đây không phải là mã QR tham gia nhóm của Alo.",
          [{ 
            text: "Quét lại", 
            onPress: () => {
              scannedRef.current = false;
              setScanned(false);
            } 
          }],
        );
        return;
      }

      const groupId = match[1];

      // 1. Fetch group details to check for membership questions
      let groupData: any;
      try {
        const groupRes = await groupService.getGroupById(groupId);
        groupData = groupRes?.data?.data || groupRes?.data || groupRes;
      } catch (err: any) {
        throw new Error("Không tìm thấy thông tin nhóm");
      }

      const requestJoin = async (answer?: string) => {
        const res = await groupService.requestJoinGroup(groupId, answer);
        let resData = res?.data || res;

        if (resData?.joined) {
          const groupInfo = resData?.data || groupData;
          const groupName = groupInfo?.name || "Nhóm";
          const groupAvatar = groupInfo?.groupAvatar || "";
          const mCount = groupInfo?.members?.length || 1;

          const navigateToChat = () => {
            router.replace({
              pathname: `/chat/${groupId}` as any,
              params: {
                name: groupName,
                avatar: groupAvatar,
                membersCount: String(mCount),
                isGroup: "true",
              },
            });
          };

          if (resData?.alreadyMember) {
            navigateToChat();
          } else {
            Alert.alert("Thành công", "Đã tham gia nhóm thành công!", [
              { text: "Vào nhóm", onPress: navigateToChat },
            ]);
          }
        } else {
          Alert.alert(
            "Yêu cầu đã gửi",
            "Nhóm yêu cầu phê duyệt để tham gia. Vui lòng chờ Quản trị viên duyệt nhóm.",
            [{ text: "Xong", onPress: () => router.back() }],
          );
        }
      };

      // 1.5. Check if already requested or already a member
      const isAlreadyRequested = groupData?.joinRequests?.some((req: any) => req.userId === currentUserId);
      const isAlreadyMember = groupData?.members?.some((m: any) => m.userId === currentUserId);

      if (isAlreadyMember) {
        // Navigate to chat immediately
        router.replace({
          pathname: `/chat/${groupId}` as any,
          params: {
            name: groupData.name || "Nhóm",
            avatar: groupData.groupAvatar || "",
            membersCount: String(groupData.members?.length || 1),
            isGroup: "true",
          },
        });
        return;
      }

      if (isAlreadyRequested) {
        Alert.alert(
          "Yêu cầu đã gửi",
          "Bạn đã gửi yêu cầu tham gia nhóm này rồi. Vui lòng chờ Quản trị viên phê duyệt.",
          [{ text: "Đóng", onPress: () => router.back() }],
        );
        return;
      }

      // 2. Handle question if it exists
      if (groupData?.isQuestionEnabled && groupData?.membershipQuestion) {
        setScanned(false);
        scannedRef.current = false;
        router.replace({
          pathname: "/chat/answer-question",
          params: {
            id: groupId,
            question: groupData.membershipQuestion,
            name: groupData.name || "Nhóm",
            avatar: groupData.groupAvatar || "",
          },
        });
      } else {
        await requestJoin();
      }
    } catch (error: any) {
      const errorMsg =
        error?.response?.data?.error || "Không thể tham gia nhóm";
      
      if (errorMsg === "Bạn đã gửi yêu cầu tham gia rồi") {
        Alert.alert(
          "Yêu cầu đã gửi",
          "Bạn đã gửi yêu cầu tham gia nhóm này rồi. Vui lòng chờ Quản trị viên phê duyệt.",
          [{ text: "Đóng", onPress: () => router.back() }],
        );
      } else {
        Alert.alert("Thông báo", errorMsg, [
          { 
            text: "Quét lại", 
            onPress: () => {
              scannedRef.current = false;
              setScanned(false);
            } 
          },
          { text: "Huỷ", onPress: () => router.back() },
        ]);
      }
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
