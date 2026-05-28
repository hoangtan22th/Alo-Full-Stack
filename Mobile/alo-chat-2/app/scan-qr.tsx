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
import api from "../services/api";
import { contactService } from "../services/contactService";
import { groupService } from "../services/groupService";
import { useAuth } from "../contexts/AuthContext";

export default function UniversalQrScannerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const currentUserId = user?.id || user?._id || user?.userId || null;
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Đang xử lý...");
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

    // Xử lý 1: Đăng nhập Web
    if (data.startsWith("alo-chat://login?token=")) {
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
      setLoadingMessage("Đang đăng nhập...");
      try {
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
      return;
    }

    // Xử lý 2: Tham gia nhóm bằng link (https://alo.chat/g/{groupId})
    const groupMatch = data.match(/https:\/\/alo\.chat\/g\/([a-zA-Z0-9_-]+)/);
    if (groupMatch) {
      const groupId = groupMatch[1];
      setLoading(true);
      setLoadingMessage("Đang kiểm tra nhóm...");
      try {
        // 1. Fetch group details to check for membership questions
        const groupRes = await groupService.getGroupById(groupId);
        const groupData = groupRes?.data?.data || groupRes?.data || groupRes;

        if (!groupData) {
          throw new Error("Không tìm thấy thông tin nhóm");
        }

        const requestJoin = async (answer?: string) => {
          setLoading(true);
          setLoadingMessage("Đang yêu cầu tham gia...");
          try {
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
                [{ text: "Đóng", onPress: () => router.back() }],
              );
            }
          } catch (error: any) {
             const errorMsg =
              error.response?.data?.error ||
              error.response?.data?.message ||
              "Không thể tham gia nhóm. Vui lòng thử lại sau.";
             Alert.alert("Thông báo", errorMsg);
          } finally {
            setLoading(false);
          }
        };

        // 1.5. Check if already requested or already a member
        const isAlreadyRequested = groupData?.joinRequests?.some((req: any) => req.userId === currentUserId);
        const isAlreadyMember = groupData?.members?.some((m: any) => m.userId === currentUserId);

        if (isAlreadyMember) {
          setLoading(false);
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
          setLoading(false);
          Alert.alert(
            "Yêu cầu đã gửi",
            "Bạn đã gửi yêu cầu tham gia nhóm này rồi. Vui lòng chờ Quản trị viên phê duyệt.",
            [{ text: "Đóng", onPress: () => router.back() }],
          );
          return;
        }

        // 2. Handle question if it exists
        if (groupData?.isQuestionEnabled && groupData?.membershipQuestion) {
          setLoading(false);
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
        // ... (existing catch logic)
        // console.error(error);
        const errorMsg =
          error.response?.data?.error ||
          error.response?.data?.message ||
          "Không thể tham gia nhóm. Vui lòng thử lại sau.";

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
              },
            },
          ]);
        }
      } finally {
        setLoading(false);
      }
      return;
    }

    // Xử lý 3: Nếu là số điện thoại quét tìm bạn bè
    // Giả sử mã QR bạn bè chỉ là số điện thoại hoặc chuỗi chứa số
    const isPhoneNumber = /^[0-9+]+$/.test(data.trim());
    if (isPhoneNumber) {
      setLoading(true);
      setLoadingMessage("Đang tìm người dùng...");
      try {
        const result = await contactService.searchUserByPhone(data.trim());
        if (result) {
          router.replace({
            pathname: "/(tabs)/contacts/send-request",
            params: {
              userId: result.userId,
              fullName: result.fullName,
              phone: result.phone,
              avatarUrl: result.avatarUrl || "",
              relationStatus: result.relationStatus || "NOT_FRIEND",
              from: "qr",
            },
          });
        } else {
          Alert.alert("Thông báo", "Không tìm thấy người dùng với mã QR này", [
            {
              text: "Quét lại",
              onPress: () => {
                scannedRef.current = false;
                setScanned(false);
              },
            },
          ]);
        }
      } catch (error) {
        console.error(error);
        Alert.alert("Lỗi", "Đã xảy ra lỗi khi tìm kiếm người dùng", [
          {
            text: "Quét lại",
            onPress: () => {
              scannedRef.current = false;
              setScanned(false);
            },
          },
        ]);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Trường hợp mã QR không hợp lệ
    Alert.alert(
      "Mã QR không hợp lệ",
      "Mã QR không thuộc hệ thống Alo hoặc không được hỗ trợ.",
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
        className="flex-row items-center py-4 absolute top-0 w-full"
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 bg-black/50 rounded-full items-center justify-center"
        >
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-white flex-1 text-center text-lg font-bold mr-10 shadow-sm">
          Máy quét thông minh
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
        {/* Overlay với lỗ hổng ở giữa (Transparent cutout) */}
        <View style={StyleSheet.absoluteFillObject}>
          {/* Top Mask */}
          <View className="flex-1 bg-black/60" />

          {/* Center Mask */}
          <View className="flex-row h-64">
            <View className="flex-1 bg-black/60" />
            <View className="w-64 border-2 border-white rounded-2xl relative bg-transparent">
              <View className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-xl -m-0.5" />
              <View className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-xl -m-0.5" />
              <View className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-xl -m-0.5" />
              <View className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-xl -m-0.5" />

              {loading && (
                <View className="absolute inset-0 items-center justify-center bg-black/60 rounded-2xl">
                  <ActivityIndicator size="large" color="#3b82f6" />
                  <Text className="text-white font-bold mt-2 text-center px-2">
                    {loadingMessage}
                  </Text>
                </View>
              )}
            </View>
            <View className="flex-1 bg-black/60" />
          </View>

          {/* Bottom Mask */}
          <View className="flex-1 bg-black/60 items-center pt-8">
            <Text className="text-white text-center mt-6 px-8 leading-6 bg-black/60 py-2 rounded-lg">
              Hướng camera về phía mã QR để quét
            </Text>
          </View>
        </View>
      </CameraView>
    </View>
  );
}
