import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import { groupService } from "../../services/groupService";
import { userService } from "../../services/userService";
import { contactService } from "../../services/contactService";
import { useAuth } from "../../contexts/AuthContext";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import {
  ArrowLeftIcon,
  EllipsisVerticalIcon,
  BellSlashIcon,
  MapPinIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  DocumentTextIcon,
  TableCellsIcon,
  ClockIcon,
  EyeSlashIcon,
  TrashIcon,
  ChevronRightIcon,
  UserPlusIcon,
  ArrowRightOnRectangleIcon,
  XMarkIcon,
  PencilIcon,
  CameraIcon,
  LinkIcon,
} from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";

export default function ChatInfoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, name, avatar, membersCount } = useLocalSearchParams();
  const { user } = useAuth();
  const currentUserId = user?.id || user?._id || user?.userId || null;

  const isGroup = !!membersCount;

  const [members, setMembers] = useState<any[]>([]);
  const [groupName, setGroupName] = useState<string>(name as string);
  const [groupAvatar, setGroupAvatar] = useState<string>(avatar as string);
  const [isTransferLeaderModalVisible, setIsTransferLeaderModalVisible] =
    useState(false);
  const [selectedNewLeaderId, setSelectedNewLeaderId] = useState<string | null>(
    null,
  );
  const [isLinkEnabled, setIsLinkEnabled] = useState(false);

  const fetchGroupDetails = async () => {
    try {
      if (!isGroup || !id) return;
      const res = await groupService.getGroupById(id as string);

      // Xử lý dữ liệu trả về từ API (Axios response)
      let groupData = res;
      if (res?.data?.data) {
        groupData = res.data.data;
      } else if (res?.data) {
        groupData = res.data;
      }

      if (groupData?.name) {
        setGroupName(groupData.name);
      }
      if (groupData?.groupAvatar) {
        setGroupAvatar(groupData.groupAvatar);
      }
      if (typeof groupData?.isLinkEnabled === "boolean") {
        setIsLinkEnabled(groupData.isLinkEnabled);
      }

      if (groupData && groupData.members) {
        const memberPromises = groupData.members.map(async (m: any) => {
          const userRes = await userService.getUserById(m.userId);
          const userData =
            userRes && (userRes as any).data ? (userRes as any).data : userRes;
          return {
            id: m.userId,
            name: userData?.fullName || "Người dùng",
            role: m.role.toLowerCase(), // "leader", "deputy", "member"
            avatar: userData?.avatar || "",
          };
        });
        const membersList = await Promise.all(memberPromises);
        setMembers(membersList);
      }
    } catch (error) {
      console.error("Lỗi lấy chi tiết nhóm:", error);
    }
  };

  useEffect(() => {
    fetchGroupDetails();
  }, [id]);

  const currentUserRole = members.find((m) => m.id === currentUserId)?.role;
  const isAdmin = currentUserRole === "leader";
  const isDeputy = currentUserRole === "deputy";

  const handleLeaveGroup = () => {
    if (isAdmin) {
      const otherMembers = members.filter((m) => m.id !== currentUserId);
      if (otherMembers.length === 0) {
        Alert.alert(
          "Nhóm không còn ai",
          "Bạn là thành viên duy nhất. Vui lòng giải tán nhóm.",
        );
        return;
      }
      setIsTransferLeaderModalVisible(true);
      return;
    }

    Alert.alert("Rời nhóm", "Bạn có chắc chắn muốn rời khỏi nhóm này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Rời nhóm",
        style: "destructive",
        onPress: async () => {
          try {
            if (!currentUserId) return;
            await groupService.removeMember(id as string, currentUserId);
            Alert.alert("Thành công", "Đã rời nhóm.");
            router.replace("/(tabs)");
          } catch (error) {
            Alert.alert(
              "Lỗi",
              typeof error === "string" ? error : "Không thể rời nhóm",
            );
          }
        },
      },
    ]);
  };

  const handleTransferAndLeave = async () => {
    if (!selectedNewLeaderId || !currentUserId) {
      Alert.alert("Lỗi", "Vui lòng chọn trưởng nhóm mới");
      return;
    }
    try {
      await groupService.assignLeader(id as string, selectedNewLeaderId);
      await groupService.removeMember(id as string, currentUserId);
      setIsTransferLeaderModalVisible(false);
      Alert.alert("Thành công", "Đã chuyển quyền trưởng nhóm và rời nhóm.");
      router.replace("/(tabs)");
    } catch (error) {
      console.error(error);
      Alert.alert(
        "Lỗi",
        typeof error === "string" ? error : "Không thể thực hiện tao tác.",
      );
    }
  };

  const handleChangeAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        await groupService.updateGroup(id as string, undefined, imageUri);
        Alert.alert("Thành công", "Đã cập nhật ảnh đại diện nhóm");
        fetchGroupDetails();
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Lỗi", "Không thể cập nhật ảnh đại diện.");
    }
  };

  const handleEditName = () => {
    Alert.prompt(
      "Đổi tên nhóm",
      "Nhập tên nhóm mới:",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Lưu",
          onPress: async (newName?: string) => {
            const trimmedName = newName?.trim();
            if (!trimmedName) return;
            try {
              await groupService.updateGroup(id as string, trimmedName);
              Alert.alert("Thành công", "Đã cập nhật tên nhóm");
              fetchGroupDetails();
            } catch (error) {
              console.error(error);
              Alert.alert("Lỗi", "Không thể cập nhật tên nhóm.");
            }
          },
        },
      ],
      "plain-text",
      groupName,
    );
  };

  const handleDisbandGroup = () => {
    Alert.alert(
      "Giải tán nhóm",
      "Bạn có chắc chắn muốn giải tán nhóm này? Hành động này không thể hoàn tác.",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Giải tán",
          style: "destructive",
          onPress: async () => {
            try {
              await groupService.deleteGroup(id as string);
              Alert.alert("Thành công", "Nhóm đã bị giải tán.");
              router.back();
              router.back();
            } catch (error) {
              Alert.alert("Lỗi", "Không thể giải tán nhóm.");
            }
          },
        },
      ],
    );
  };

  // Dummy images... (Keep the rest of the file)
  const images = [
    "https://images.unsplash.com/photo-1541698444083-023c97d3f4b6?q=80&w=400",
    "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=400",
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=400",
    "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=400",
    "https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=400",
    "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?q=80&w=400",
  ];

  return (
    <View className="flex-1 bg-[#fcfcfc]" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ArrowLeftIcon size={24} color="#000" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900">Thông tin</Text>
        <TouchableOpacity className="p-2 -mr-2">
          <EllipsisVerticalIcon size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {/* Profile Info */}
        <View className="items-center mt-6">
          <View className="relative">
            <TouchableOpacity
              disabled={!isGroup}
              activeOpacity={0.7}
              onPress={handleChangeAvatar}
            >
              {groupAvatar ? (
                <Image
                  source={{ uri: groupAvatar as string }}
                  className="w-[100px] h-[100px] rounded-full bg-gray-200"
                />
              ) : (
                <View className="w-[100px] h-[100px] rounded-full bg-gray-800 items-center justify-center">
                  <Text className="text-white font-bold text-3xl">
                    {((groupName as string) || "G").charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {isGroup ? (
              <TouchableOpacity
                onPress={handleChangeAvatar}
                className="absolute bottom-0 right-0 w-8 h-8 bg-[#f5f6f8] border-[3px] border-white rounded-full items-center justify-center shadow-sm"
              >
                <CameraIcon size={16} color="#4b5563" />
              </TouchableOpacity>
            ) : (
              !membersCount && (
                <View className="absolute bottom-1 right-2 w-[18px] h-[18px] bg-green-500 border-[3px] border-white rounded-full" />
              )
            )}
          </View>

          <View className="flex-row items-center justify-center mt-4 mb-1">
            {isGroup && <View className="w-8" />}
            <Text className="text-[22px] font-extrabold text-gray-900 text-center">
              {groupName || `Nhóm ${id}`}
            </Text>
            {isGroup && (
              <TouchableOpacity
                className="ml-2 p-1 w-6 items-start"
                onPress={handleEditName}
              >
                <PencilIcon size={20} color="#6b7280" />
              </TouchableOpacity>
            )}
          </View>

          <Text className="text-[13px] text-gray-500 font-medium">
            {membersCount ? `${membersCount} thành viên` : "Đang hoạt động"}
          </Text>
        </View>

        {/* Quick Actions */}
        <View className="flex-row justify-center mt-7 gap-5 px-5">
          <ActionButton
            icon={<BellSlashIcon size={24} color="#374151" strokeWidth={1.5} />}
            label="Tắt báo"
          />
          <ActionButton
            icon={<MapPinIcon size={24} color="#374151" strokeWidth={1.5} />}
            label="Ghim"
          />
          <ActionButton
            icon={
              <MagnifyingGlassIcon
                size={24}
                color="#374151"
                strokeWidth={1.5}
              />
            }
            label="Tìm kiếm"
          />
          {membersCount ? (
            <ActionButton
              icon={
                <UserGroupIcon size={24} color="#374151" strokeWidth={1.5} />
              }
              label="Thành viên"
              onPress={() => router.push(`/chat/members?id=${id}`)}
            />
          ) : (
            <ActionButton
              icon={
                <UserGroupIcon size={24} color="#374151" strokeWidth={1.5} />
              }
              label="Nhóm chung"
            />
          )}
        </View>

        {/* SECTION: ẢNH / VIDEO */}
        <View className="mt-10 px-5">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-[11px] font-bold text-gray-500 uppercase tracking-[1px]">
              Ảnh / Video
            </Text>
            <TouchableOpacity>
              <Text className="text-[12px] font-bold text-gray-900">
                Xem tất cả
              </Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row flex-wrap justify-between">
            {images.slice(0, 5).map((img, idx) => (
              <Image
                key={idx}
                source={{ uri: img }}
                className="w-[31.5%] aspect-square rounded-2xl mb-3 bg-gray-200"
              />
            ))}
            {/* The "+12" overlay for the last image */}
            <TouchableOpacity
              className="w-[31.5%] aspect-square rounded-2xl mb-3 bg-gray-300 items-center justify-center overflow-hidden"
              activeOpacity={0.8}
            >
              <Image
                source={{ uri: images[5] }}
                className="w-full h-full absolute opacity-40"
              />
              <Text className="text-white font-bold text-[22px] z-10 shadow-sm">
                +12
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* SECTION: FILE */}
        <View className="mt-8 px-5">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-[11px] font-bold text-gray-500 uppercase tracking-[1px]">
              File
            </Text>
            <TouchableOpacity>
              <Text className="text-[12px] font-bold text-gray-900">
                Xem tất cả
              </Text>
            </TouchableOpacity>
          </View>

          {/* Wrapper for cards */}
          <View className="bg-[#f5f6f8] rounded-[24px]">
            <FileItem
              icon={<DocumentTextIcon size={24} color="#10b981" />}
              title="Bao_cao_du_an_Q4.pdf"
              info="12.5 MB • 22/10/2023"
            />
            {/* Divider */}
            <View className="h-[1px] bg-white w-[90%] self-end" />
            <FileItem
              icon={<TableCellsIcon size={24} color="#3b82f6" />}
              title="Danh_sach_nhan_su.xlsx"
              info="2.1 MB • 15/10/2023"
            />
          </View>
        </View>

        {/* SECTION: THÔNG TIN KHÁC */}
        {isGroup && (
          <View className="mt-10 px-5">
            <Text className="text-[11px] font-bold text-gray-500 uppercase tracking-[1px] mb-4">
              Thông tin khác
            </Text>

            <View className="bg-[#f5f6f8] rounded-[24px]">
              <SettingItem
                icon={<LinkIcon size={24} color="#4b5563" />}
                title="Link tham gia nhóm"
                onPress={() =>
                  router.push(
                    `/chat/link?id=${id}&name=${encodeURIComponent(
                      (groupName as string) || "",
                    )}&avatar=${encodeURIComponent(
                      (groupAvatar as string) || "",
                    )}&isLinkEnabled=${isLinkEnabled}`,
                  )
                }
              />
            </View>
          </View>
        )}

        {/* SECTION: THIẾT LẬP BẢO MẬT */}
        <View className="mt-10 px-5 pb-8">
          <Text className="text-[11px] font-bold text-gray-500 uppercase tracking-[1px] mb-4">
            Thiết lập bảo mật
          </Text>

          <View className="bg-[#f5f6f8] rounded-[24px]">
            <SettingItem
              icon={<ClockIcon size={24} color="#4b5563" />}
              title="Tin nhắn tự xóa"
              value="Tắt"
            />
            <View className="h-[1px] bg-white w-[90%] self-end" />
            <SettingItem
              icon={<EyeSlashIcon size={24} color="#4b5563" />}
              title="Ẩn trò chuyện"
            />
            <View className="h-[1px] bg-white w-full" />
            <SettingItem
              icon={<TrashIcon size={24} color="#ef4444" />}
              title="Xóa lịch sử trò chuyện"
              isDestructive
            />
          </View>
        </View>

        {isGroup && (
          <>
            {/* SECTION: RỜI / GIẢI TÁN NHÓM */}
            <View className="px-5 mt-10 pb-12">
              <View className="bg-[#fef2f2] rounded-[24px]">
                <SettingItem
                  icon={<ArrowRightOnRectangleIcon size={24} color="#ef4444" />}
                  title="Rời khỏi nhóm"
                  isDestructive
                  onPress={handleLeaveGroup}
                />
                {isAdmin && (
                  <>
                    <View className="h-[1px] bg-white w-full" />
                    <SettingItem
                      icon={<XMarkIcon size={24} color="#ef4444" />}
                      title="Giải tán nhóm"
                      isDestructive
                      onPress={handleDisbandGroup}
                    />
                  </>
                )}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Modal Chuyển quyền trưởng nhóm */}
      <Modal
        visible={isTransferLeaderModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsTransferLeaderModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl min-h-[50%] p-5">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-bold">Chọn trưởng nhóm mới</Text>
              <TouchableOpacity
                onPress={() => setIsTransferLeaderModalVisible(false)}
              >
                <XMarkIcon size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <ScrollView className="mb-4 flex-1">
              {members
                .filter((m) => m.id !== currentUserId)
                .map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    className={`flex-row items-center p-3 rounded-xl mb-2 border ${
                      selectedNewLeaderId === m.id
                        ? "border-[#007AFF] bg-[#007AFF]/10"
                        : "border-gray-200"
                    }`}
                    onPress={() => setSelectedNewLeaderId(m.id)}
                  >
                    <Image
                      source={{
                        uri: m.avatar || "https://i.pravatar.cc/150",
                      }}
                      className="w-10 h-10 rounded-full"
                    />
                    <Text className="ml-3 text-base flex-1">{m.name}</Text>
                    <View
                      className={`w-5 h-5 rounded-full border items-center justify-center ${
                        selectedNewLeaderId === m.id
                          ? "border-[#007AFF]"
                          : "border-gray-400"
                      }`}
                    >
                      {selectedNewLeaderId === m.id && (
                        <View className="w-3 h-3 rounded-full bg-[#007AFF]" />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
            </ScrollView>
            <TouchableOpacity
              className="bg-red-500 rounded-xl py-4 items-center mb-4"
              onPress={handleTransferAndLeave}
            >
              <Text className="text-white font-bold text-base">
                Chuyển quyền và rời nhóm
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// --- Các Component Phụ ---

function ActionButton({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      className="items-center w-[72px]"
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View className="w-14 h-14 bg-[#f5f6f8] rounded-full items-center justify-center mb-2">
        {icon}
      </View>
      <Text className="text-[11px] text-gray-600 font-medium text-center leading-tight">
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function FileItem({
  icon,
  title,
  info,
}: {
  icon: React.ReactNode;
  title: string;
  info: string;
}) {
  return (
    <TouchableOpacity
      className="flex-row items-center p-4 px-5"
      activeOpacity={0.7}
    >
      <View className="w-12 h-12 bg-white rounded-full items-center justify-center shadow-sm">
        {icon}
      </View>
      <View className="ml-4 flex-1">
        <Text
          className="text-[14px] font-bold text-gray-900 mb-0.5"
          numberOfLines={1}
        >
          {title}
        </Text>
        <Text className="text-[12px] text-gray-500 font-medium">{info}</Text>
      </View>
      <ChevronRightIcon size={18} color="#9ca3af" />
    </TouchableOpacity>
  );
}

function SettingItem({
  icon,
  title,
  value,
  isDestructive,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  value?: string;
  isDestructive?: boolean;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      className="flex-row items-center p-4 px-5"
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View
        className={`w-11 h-11 rounded-full items-center justify-center bg-white shadow-sm border border-gray-50`}
      >
        {icon}
      </View>
      <Text
        className={`ml-4 flex-1 text-[15px] font-medium ${
          isDestructive ? "text-red-600" : "text-gray-800"
        }`}
      >
        {title}
      </Text>
      {value && (
        <Text className="text-[13px] font-medium text-gray-500 mr-2">
          {value}
        </Text>
      )}
      {!isDestructive && <ChevronRightIcon size={18} color="#9ca3af" />}
    </TouchableOpacity>
  );
}
