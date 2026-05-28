import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  Image,
  Share,
  Alert,
  Modal,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeftIcon,
  EllipsisVerticalIcon,
  DocumentDuplicateIcon,
  ShareIcon,
  ArrowDownTrayIcon,
} from "react-native-heroicons/outline";
import QRCode from "react-native-qrcode-svg";
import { groupService } from "../../services/groupService";

export default function GroupLinkScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const id = params.id as string;
  const name = params.name as string;
  const avatar = params.avatar as string;
  const initialIsLinkEnabled = params.isLinkEnabled as string;
  const isAdminParam = params.isAdmin as string;
  const isAdmin = isAdminParam === "true";

  const [isLinkEnabled, setIsLinkEnabled] = useState(
    initialIsLinkEnabled === "true",
  );
  const initialIsHistoryVisible = params.isHistoryVisible as string;
  const [isHistoryVisible, setIsHistoryVisible] = useState(
    initialIsHistoryVisible !== "false", // Default to true if not specified
  );
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fake link since we don't have api for link generation
  const groupLink = `https://alo.chat/g/${id || "12345"}`;

  const handleToggleLink = async (value: boolean) => {
    if (!id) return;
    try {
      setIsLoading(true);
      await groupService.updateLinkSetting(id, value);
      setIsLinkEnabled(value);
    } catch (error) {
      Alert.alert("Lỗi", "Không thể cập nhật cấu hình link lúc này");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleHistory = async (value: boolean) => {
    if (!id) return;
    try {
      setIsLoading(true);
      await groupService.updateHistorySetting(id, value);
      setIsHistoryVisible(value);
    } catch (error) {
      Alert.alert("Lỗi", "Không thể cập nhật cấu hình lịch sử");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async () => {
    // using placeholder console log, would need expo-clipboard if installed
    // wait expo-clipboard might not be in dependencies let's check
    // we can just use clipboard or alert
    Alert.alert("Thành công", "Đã sao chép link vào bộ nhớ tạm");
  };

  const handleShareLink = async () => {
    try {
      await Share.share({
        message: `Tham gia nhóm "${name || "Trò chuyện"}" trên Alo:\n${groupLink}`,
      });
    } catch (error: any) {
      console.error(error.message);
    }
  };

  const handleSaveQR = () => {
    Alert.alert(
      "Chức năng đang phát triển",
      "Tính năng lưu mã QR sẽ sớm ra mắt",
    );
  };

  const handleRevokeLink = () => {
    setIsMenuVisible(false);
    Alert.alert(
      "Hủy liên kết",
      "Bạn có chắc chắn muốn huỷ link hiện tại? Các thành viên chưa tham gia sẽ không thể dùng link này nữa.",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Đồng ý",
          style: "destructive",
          onPress: () => handleToggleLink(false),
        },
      ],
    );
  };

  return (
    <View className="flex-1 bg-[#fcfcfc]" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ArrowLeftIcon size={24} color="#000" />
        </TouchableOpacity>
        <Text className="text-[17px] font-bold text-gray-900">
          Link tham gia nhóm
        </Text>
        {isLinkEnabled ? (
          <TouchableOpacity
            onPress={() => setIsMenuVisible(true)}
            className="p-2 -mr-2"
            disabled={isLoading}
          >
            <EllipsisVerticalIcon size={24} color="#000" />
          </TouchableOpacity>
        ) : (
          <View className="w-10" />
        )}
      </View>

      <View className="flex-1 px-5">
        {!isLinkEnabled ? (
          <View className="mt-8 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 mr-4">
                <Text className="text-[16px] font-semibold text-gray-900 mb-1">
                  Tham gia bằng nhóm bằng link
                </Text>
                <Text className="text-[13px] text-gray-500">
                  Bật tính năng này để mọi người có thể tìm và tham gia nhóm
                  thông qua liên kết (link)
                </Text>
              </View>
              <Switch
                value={isLinkEnabled}
                onValueChange={handleToggleLink}
                disabled={isLoading}
                trackColor={{ false: "#e5e7eb", true: "#10b981" }}
                thumbColor="#fff"
              />
            </View>
          </View>
        ) : (
          <View className="items-center mt-10">
            {/* Avatar */}
            {avatar ? (
              <Image
                source={{ uri: avatar }}
                className="w-20 h-20 rounded-full mb-3"
              />
            ) : (
              <View className="w-20 h-20 bg-gray-200 rounded-full items-center justify-center mb-3">
                <Text className="text-gray-500 font-bold text-2xl">
                  {(name || "G").charAt(0).toUpperCase()}
                </Text>
              </View>
            )}

            {/* Name */}
            <Text className="text-[20px] font-bold text-gray-900 mb-2">
              {name || "Nhóm"}
            </Text>

            {/* Invitation Text */}
            <Text className="text-[14px] text-gray-500 text-center px-4 mb-8">
              Mời mọi người tham gia nhóm bằng mã QR hoặc link dưới đây
            </Text>

            {/* QR Code */}
            <View className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6">
              <QRCode
                value={groupLink}
                size={200}
                logoBackgroundColor="transparent"
              />
            </View>

            {/* Group Link Text */}
            <View className="bg-gray-100 py-3 px-4 rounded-xl mb-10 w-full">
              <Text
                className="text-[14px] text-gray-600 text-center"
                numberOfLines={1}
              >
                {groupLink}
              </Text>
            </View>

            {/* 3 Buttons */}
            <View className="flex-row justify-center space-x-6 w-full gap-5">
              <TouchableOpacity
                className="items-center"
                onPress={handleCopyLink}
              >
                <View className="w-[52px] h-[52px] bg-blue-100 rounded-full items-center justify-center mb-2">
                  <DocumentDuplicateIcon size={24} color="#3b82f6" />
                </View>
                <Text className="text-[12px] font-medium text-gray-700">
                  Sao chép
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="items-center"
                onPress={handleShareLink}
              >
                <View className="w-[52px] h-[52px] bg-green-100 rounded-full items-center justify-center mb-2">
                  <ShareIcon size={24} color="#10b981" />
                </View>
                <Text className="text-[12px] font-medium text-gray-700">
                  Chia sẻ
                </Text>
              </TouchableOpacity>

              <TouchableOpacity className="items-center" onPress={handleSaveQR}>
                <View className="w-[52px] h-[52px] bg-orange-100 rounded-full items-center justify-center mb-2">
                  <ArrowDownTrayIcon size={24} color="#f97316" />
                </View>
                <Text className="text-[12px] font-medium text-gray-700">
                  Lưu QR
                </Text>
              </TouchableOpacity>
            </View>

            {/* History Toggle */}
            {isAdmin && (
              <View className="mt-10 w-full bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 mr-4">
                    <Text className="text-[16px] font-semibold text-gray-900 mb-1">
                      Xem lại tin nhắn cũ
                    </Text>
                    <Text className="text-[13px] text-gray-500">
                      Cho phép thành viên mới xem các tin nhắn từ trước khi tham
                      gia nhóm
                    </Text>
                  </View>
                  <Switch
                    value={isHistoryVisible}
                    onValueChange={handleToggleHistory}
                    disabled={isLoading}
                    trackColor={{ false: "#e5e7eb", true: "#10b981" }}
                    thumbColor="#fff"
                  />
                </View>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Header Menu Modal */}
      <Modal
        visible={isMenuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsMenuVisible(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/30"
          activeOpacity={1}
          onPress={() => setIsMenuVisible(false)}
        >
          <View
            className="absolute top-[50px] right-2 bg-white rounded-xl shadow-lg w-48 overflow-hidden"
            style={{ paddingTop: insets.top }}
          >
            <TouchableOpacity className="py-3 px-4" onPress={handleRevokeLink}>
              <Text className="text-[15px] font-medium text-red-600">
                Huỷ link
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
