import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import React, { useState, useCallback, useEffect } from "react";
import { groupService } from "../../services/groupService";
import { userService } from "../../services/userService";
import { useAuth } from "../../contexts/AuthContext";
import { useSocket } from "../../contexts/SocketContext";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Switch,
  ActivityIndicator,
  Modal,
} from "react-native";
import {
  ArrowLeftIcon,
  PencilIcon,
  CameraIcon,
  UserPlusIcon,
  TrashIcon,
  XMarkIcon,
  ShieldCheckIcon,
  LinkIcon,
  ClockIcon,
  UsersIcon,
  KeyIcon,
  ChatBubbleLeftRightIcon,
  BellAlertIcon,
  IdentificationIcon,
  DocumentTextIcon,
  ChartBarIcon,
  MapPinIcon,
  PaperAirplaneIcon,
  ChevronRightIcon,
  CheckIcon,
} from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";

interface GroupPermissions {
  editGroupInfo: "EVERYONE" | "ADMIN";
  createNotes: "EVERYONE" | "ADMIN";
  createPolls: "EVERYONE" | "ADMIN";
  pinMessages: "EVERYONE" | "ADMIN";
  sendMessage: "EVERYONE" | "ADMIN";
}

export default function GroupSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const currentUserId = user?.id || user?._id || user?.userId || null;
  const { socket } = useSocket();

  const [loading, setLoading] = useState(true);
  const [groupData, setGroupData] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);

  // Settings states
  const [groupName, setGroupName] = useState("");
  const [groupAvatar, setGroupAvatar] = useState("");
  const [isApprovalRequired, setIsApprovalRequired] = useState(false);
  const [isLinkEnabled, setIsLinkEnabled] = useState(false);
  const [isHistoryVisible, setIsHistoryVisible] = useState(true);

  // New states
  const [isHighlightEnabled, setIsHighlightEnabled] = useState(false);
  const [permissions, setPermissions] = useState<GroupPermissions>({
    editGroupInfo: "ADMIN",
    createNotes: "EVERYONE",
    createPolls: "EVERYONE",
    pinMessages: "ADMIN",
    sendMessage: "EVERYONE",
  });

  const [isTransferLeaderModalVisible, setIsTransferLeaderModalVisible] =
    useState(false);
  const [selectedNewLeaderId, setSelectedNewLeaderId] = useState<string | null>(
    null,
  );

  const [isPermissionModalVisible, setIsPermissionModalVisible] =
    useState(false);
  const [currentPermissionField, setCurrentPermissionField] = useState<
    keyof GroupPermissions | null
  >(null);

  const fetchGroupDetails = async () => {
    try {
      if (!id) return;
      const res = await groupService.getGroupById(id as string);
      let data = res?.data?.data || res?.data || res;

      if (!data) return;

      setGroupData(data);
      setGroupName(data.name || "");
      setGroupAvatar(data.groupAvatar || "");
      setIsApprovalRequired(data.isApprovalRequired || false);
      setIsLinkEnabled(data.isLinkEnabled !== false);
      setIsHistoryVisible(data.isHistoryVisible !== false);

      // Load new settings
      setIsHighlightEnabled(data.isHighlightEnabled || false);
      if (data.permissions) {
        setPermissions({
          editGroupInfo: data.permissions.editGroupInfo || "ADMIN",
          createNotes: data.permissions.createNotes || "EVERYONE",
          createPolls: data.permissions.createPolls || "EVERYONE",
          pinMessages: data.permissions.pinMessages || "ADMIN",
          sendMessage: data.permissions.sendMessage || "EVERYONE",
        });
      }

      if (data.members) {
        setMembers(data.members);
      }
    } catch (error) {
      console.error("Lỗi lấy chi tiết nhóm:", error);
      Alert.alert("Lỗi", "Không thể lấy thông tin nhóm.");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchGroupDetails();
    }, [id]),
  );

  useEffect(() => {
    if (!socket || !id) return;

    const handleGroupUpdated = (updatedGroup: any) => {
      if (updatedGroup._id === id) {
        fetchGroupDetails();
      }
    };

    socket.on("GROUP_UPDATED", handleGroupUpdated);
    return () => {
      socket.off("GROUP_UPDATED", handleGroupUpdated);
    };
  }, [socket, id]);

  const currentUserRole = members
    .find((m) => m.userId === currentUserId)
    ?.role?.toLowerCase();
  const isAdmin = currentUserRole === "leader";
  const isDeputy = currentUserRole === "deputy";
  const isManager = isAdmin || isDeputy;

  if (!isManager && !loading) {
    return (
      <View className="flex-1 items-center justify-center p-5 bg-white">
        <ShieldCheckIcon size={60} color="#ef4444" />
        <Text className="text-lg font-bold mt-4 text-center">
          Bạn không có quyền truy cập màn hình này
        </Text>
        <TouchableOpacity
          className="mt-6 bg-blue-500 px-6 py-3 rounded-full"
          onPress={() => router.back()}
        >
          <Text className="text-white font-bold">Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
            if (!trimmedName || trimmedName === groupName) return;
            try {
              await groupService.updateGroup(id as string, trimmedName);
              Alert.alert("Thành công", "Đã cập nhật tên nhóm");
              fetchGroupDetails();
            } catch (error) {
              Alert.alert("Lỗi", "Không thể cập nhật tên nhóm.");
            }
          },
        },
      ],
      "plain-text",
      groupName,
    );
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
      Alert.alert("Lỗi", "Không thể cập nhật ảnh đại diện.");
    }
  };

  const toggleHighlight = async (value: boolean) => {
    try {
      setIsHighlightEnabled(value);
      await groupService.updateGroupSettings(id as string, {
        isHighlightEnabled: value,
      });
    } catch (error) {
      setIsHighlightEnabled(!value);
      Alert.alert("Lỗi", "Không thể cập nhật thiết lập nổi bật.");
    }
  };

  const toggleHistory = async (value: boolean) => {
    try {
      setIsHistoryVisible(value);
      await groupService.updateHistorySetting(id as string, value);
    } catch (error) {
      setIsHistoryVisible(!value);
      Alert.alert("Lỗi", "Không thể cập nhật cấu hình lịch sử tin nhắn.");
    }
  };

  const setPermissionValue = async (
    field: keyof GroupPermissions,
    value: "EVERYONE" | "ADMIN",
  ) => {
    try {
      const newPermissions: GroupPermissions = {
        ...permissions,
        [field]: value,
      };
      setPermissions(newPermissions);
      await groupService.updateGroupSettings(id as string, {
        permissions: newPermissions,
      });
      setIsPermissionModalVisible(false);
    } catch (error) {
      Alert.alert("Lỗi", "Không thể cập nhật quyền.");
    }
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
              router.replace("/(tabs)");
            } catch (error) {
              Alert.alert("Lỗi", "Không thể giải tán nhóm.");
            }
          },
        },
      ],
    );
  };

  const handleTransferLeader = async () => {
    if (!selectedNewLeaderId) {
      Alert.alert("Lỗi", "Vui lòng chọn trưởng nhóm mới");
      return;
    }
    try {
      await groupService.assignLeader(id as string, selectedNewLeaderId);
      setIsTransferLeaderModalVisible(false);
      Alert.alert("Thành công", "Đã chuyển quyền trưởng nhóm.");
      fetchGroupDetails();
    } catch (error) {
      Alert.alert("Lỗi", "Không thể thực hiện tao tác.");
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  const openPermissionModal = (field: keyof GroupPermissions) => {
    setCurrentPermissionField(field);
    setIsPermissionModalVisible(true);
  };

  const getPermissionLabel = (field: keyof GroupPermissions) => {
    const val = permissions[field];
    return val === "ADMIN" ? "Chỉ trưởng/phó nhóm" : "Tất cả mọi người";
  };

  return (
    <View className="flex-1 bg-[#fcfcfc]" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-gray-100 bg-white">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ArrowLeftIcon size={24} color="#000" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900 ml-2">
          Cài đặt nhóm
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {/* Group Profile */}
        <View className="items-center mt-6 px-5">
          <View className="relative">
            <TouchableOpacity activeOpacity={0.7} onPress={handleChangeAvatar}>
              {groupAvatar ? (
                <Image
                  source={{ uri: groupAvatar }}
                  style={{ width: 100, height: 100, borderRadius: 50 }}
                  className="bg-gray-200"
                />
              ) : (
                <View className="w-[100px] h-[100px] rounded-full bg-gray-800 items-center justify-center">
                  <Text className="text-white font-bold text-4xl">
                    {(groupName || "G").charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View className="absolute bottom-0 right-0 w-9 h-9 bg-white border-[2px] border-gray-100 rounded-full items-center justify-center shadow-lg">
                <CameraIcon size={20} color="#4b5563" />
              </View>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            className="flex-row items-center mt-5 bg-white border border-gray-100 px-5 py-3 rounded-2xl shadow-sm"
            onPress={handleEditName}
          >
            <Text className="text-xl font-bold text-gray-900 mr-3">
              {groupName}
            </Text>
            <PencilIcon size={18} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {/* --- SECTION 1: THIẾT LẬP TIN NHẮN --- */}
        <View className="mt-8 px-5">
          <Text className="text-[12px] font-bold text-gray-400 uppercase tracking-[1.5px] mb-4 ml-2">
            Thiết lập tin nhắn
          </Text>
          <View className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden">
            <ToggleItem
              icon={<BellAlertIcon size={24} color="#f59e0b" />}
              title="Làm nổi bật tin nhắn của Admin"
              description="Tin nhắn từ trưởng/phó nhóm sẽ được hiển thị đặc biệt"
              value={isHighlightEnabled}
              onValueChange={toggleHighlight}
            />
            <View className="h-[1px] bg-gray-50 w-[90%] self-center" />
            <ToggleItem
              icon={<ClockIcon size={24} color="#3b82f6" />}
              title="Xem tin nhắn gần đây"
              description="Thành viên mới được xem các tin nhắn cũ"
              value={isHistoryVisible}
              onValueChange={toggleHistory}
            />
          </View>
        </View>

        {/* --- SECTION 2: THÀNH VIÊN --- */}
        <View className="mt-8 px-5">
          <Text className="text-[12px] font-bold text-gray-400 uppercase tracking-[1.5px] mb-4 ml-2">
            Thành viên
          </Text>
          <View className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden">
            <NavItem
              icon={<UsersIcon size={24} color="#6366f1" />}
              title="Quản lý thành viên"
              onPress={() => router.push(`/chat/members?id=${id}`)}
            />
            <View className="h-[1px] bg-gray-50 w-[90%] self-center" />
            <NavItem
              icon={<IdentificationIcon size={24} color="#10b981" />}
              title="Duyệt thành viên"
              badgeCount={groupData?.joinRequests?.length}
              onPress={() => router.push(`/chat/pending-members?id=${id}`)}
            />
          </View>
        </View>

        {/* --- SECTION 3: QUYỀN CỦA THÀNH VIÊN --- */}
        <View className="mt-8 px-5">
          <Text className="text-[12px] font-bold text-gray-400 uppercase tracking-[1.5px] mb-4 ml-2">
            Quyền của thành viên
          </Text>
          <View className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden">
            <PermissionItem
              icon={<PencilIcon size={22} color="#4b5563" />}
              title="Đổi thông tin nhóm"
              value={getPermissionLabel("editGroupInfo")}
              onPress={() => openPermissionModal("editGroupInfo")}
            />
            <View className="h-[1px] bg-gray-50 w-[90%] self-center" />
            <PermissionItem
              icon={<DocumentTextIcon size={22} color="#4b5563" />}
              title="Tạo ghi chú, nhắc hẹn"
              value={getPermissionLabel("createNotes")}
              onPress={() => openPermissionModal("createNotes")}
            />
            <View className="h-[1px] bg-gray-50 w-[90%] self-center" />
            <PermissionItem
              icon={<ChartBarIcon size={22} color="#4b5563" />}
              title="Tạo bình chọn"
              value={getPermissionLabel("createPolls")}
              onPress={() => openPermissionModal("createPolls")}
            />
            <View className="h-[1px] bg-gray-50 w-[90%] self-center" />
            <PermissionItem
              icon={<MapPinIcon size={22} color="#4b5563" />}
              title="Ghim tin nhắn"
              value={getPermissionLabel("pinMessages")}
              onPress={() => openPermissionModal("pinMessages")}
            />
            <View className="h-[1px] bg-gray-50 w-[90%] self-center" />
            <PermissionItem
              icon={<PaperAirplaneIcon size={22} color="#4b5563" />}
              title="Gửi tin nhắn"
              value={getPermissionLabel("sendMessage")}
              onPress={() => openPermissionModal("sendMessage")}
            />
          </View>
        </View>

        {/* Existing Admin Actions */}
        {isAdmin && (
          <View className="mt-10 px-5">
            <Text className="text-[12px] font-bold text-red-400 uppercase tracking-[1.5px] mb-4 ml-2">
              Vùng nguy hiểm
            </Text>
            <View className="bg-white rounded-[24px] border border-red-50 shadow-sm overflow-hidden">
              {/* <TouchableOpacity
                className="flex-row items-center p-4"
                onPress={() => setIsTransferLeaderModalVisible(true)}
              >
                <View className="w-10 h-10 bg-gray-50 rounded-full items-center justify-center mr-4">
                  <UserPlusIcon size={22} color="#4b5563" />
                </View>
                <Text className="text-[15px] font-medium text-gray-800">Chuyển quyền trưởng nhóm</Text>
              </TouchableOpacity> */}
              <View className="h-[1px] bg-red-50 w-[90%] self-center" />
              <TouchableOpacity
                className="flex-row items-center p-4"
                onPress={handleDisbandGroup}
              >
                <View className="w-10 h-10 bg-red-50 rounded-full items-center justify-center mr-4">
                  <TrashIcon size={22} color="#ef4444" />
                </View>
                <Text className="text-[15px] font-medium text-red-600">
                  Giải tán nhóm
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View className="h-32" />
      </ScrollView>

      {/* Permission Modal */}
      <Modal
        visible={isPermissionModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsPermissionModalVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setIsPermissionModalVisible(false)}
          className="flex-1 justify-end bg-black/40"
        >
          <View className="bg-white rounded-t-[32px] p-6 pb-12 shadow-2xl">
            <View className="w-12 h-1.5 bg-gray-100 rounded-full self-center mb-6" />
            <Text className="text-xl font-bold text-gray-900 mb-6 text-center">
              Ai có quyền thực hiện?
            </Text>

            <TouchableOpacity
              onPress={() =>
                currentPermissionField &&
                setPermissionValue(currentPermissionField, "EVERYONE")
              }
              className={`flex-row items-center p-4 rounded-2xl mb-3 ${
                currentPermissionField &&
                (permissions as any)[currentPermissionField] === "EVERYONE"
                  ? "bg-blue-50 border border-blue-100"
                  : "bg-gray-50"
              }`}
            >
              <View
                className={`w-6 h-6 rounded-full border-2 mr-4 items-center justify-center ${
                  currentPermissionField &&
                  (permissions as any)[currentPermissionField] === "EVERYONE"
                    ? "border-blue-500"
                    : "border-gray-300"
                }`}
              >
                {currentPermissionField &&
                  (permissions as any)[currentPermissionField] ===
                    "EVERYONE" && (
                    <View className="w-3 h-3 bg-blue-500 rounded-full" />
                  )}
              </View>
              <Text
                className={`text-base font-semibold ${
                  currentPermissionField &&
                  (permissions as any)[currentPermissionField] === "EVERYONE"
                    ? "text-blue-700"
                    : "text-gray-700"
                }`}
              >
                Tất cả mọi người
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                currentPermissionField &&
                setPermissionValue(currentPermissionField, "ADMIN")
              }
              className={`flex-row items-center p-4 rounded-2xl ${
                currentPermissionField &&
                (permissions as any)[currentPermissionField] === "ADMIN"
                  ? "bg-blue-50 border border-blue-100"
                  : "bg-gray-50"
              }`}
            >
              <View
                className={`w-6 h-6 rounded-full border-2 mr-4 items-center justify-center ${
                  currentPermissionField &&
                  (permissions as any)[currentPermissionField] === "ADMIN"
                    ? "border-blue-500"
                    : "border-gray-300"
                }`}
              >
                {currentPermissionField &&
                  (permissions as any)[currentPermissionField] === "ADMIN" && (
                    <View className="w-3 h-3 bg-blue-500 rounded-full" />
                  )}
              </View>
              <Text
                className={`text-base font-semibold ${
                  currentPermissionField &&
                  (permissions as any)[currentPermissionField] === "ADMIN"
                    ? "text-blue-700"
                    : "text-gray-700"
                }`}
              >
                Chỉ trưởng/phó nhóm
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Transfer Leader Modal */}
      <Modal
        visible={isTransferLeaderModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsTransferLeaderModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-[32px] min-h-[60%] p-6 shadow-2xl">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-bold text-gray-900">
                Chọn trưởng nhóm mới
              </Text>
              <TouchableOpacity
                onPress={() => setIsTransferLeaderModalVisible(false)}
                className="bg-gray-100 p-2 rounded-full"
              >
                <XMarkIcon size={20} color="#000" />
              </TouchableOpacity>
            </View>
            <ScrollView
              className="mb-6 flex-1"
              showsVerticalScrollIndicator={false}
            >
              {members
                .filter((m) => m.userId !== currentUserId)
                .map((m) => (
                  <MemberItem
                    key={m.userId}
                    member={m}
                    isSelected={selectedNewLeaderId === m.userId}
                    onSelect={() => setSelectedNewLeaderId(m.userId)}
                  />
                ))}
            </ScrollView>
            <TouchableOpacity
              className={`rounded-2xl py-4 items-center mb-4 ${selectedNewLeaderId ? "bg-red-500 shadow-lg shadow-red-200" : "bg-gray-200"}`}
              disabled={!selectedNewLeaderId}
              onPress={handleTransferLeader}
            >
              <Text
                className={`font-bold text-base ${selectedNewLeaderId ? "text-white" : "text-gray-400"}`}
              >
                Xác nhận chuyển quyền
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ToggleItem({ icon, title, description, value, onValueChange }: any) {
  return (
    <View className="flex-row items-center p-5">
      <View className="w-11 h-11 bg-gray-50 rounded-2xl items-center justify-center mr-4 border border-gray-100">
        {icon}
      </View>
      <View className="flex-1 mr-4">
        <Text className="text-[15px] font-bold text-gray-800">{title}</Text>
        {description && (
          <Text className="text-[11px] text-gray-400 mt-0.5" numberOfLines={1}>
            {description}
          </Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#e5e7eb", true: "#3b82f6" }}
        thumbColor={"#ffffff"}
        ios_backgroundColor="#e5e7eb"
      />
    </View>
  );
}

function NavItem({ icon, title, onPress, badgeCount }: any) {
  return (
    <TouchableOpacity onPress={onPress} className="flex-row items-center p-5">
      <View className="w-11 h-11 bg-gray-50 rounded-2xl items-center justify-center mr-4 border border-gray-100">
        {icon}
      </View>
      <View className="flex-1 flex-row items-center justify-between">
        <Text className="text-[15px] font-bold text-gray-800">{title}</Text>
        <View className="flex-row items-center">
          {badgeCount > 0 && (
            <View className="bg-red-500 px-2 py-0.5 rounded-full mr-2">
              <Text className="text-white text-[10px] font-bold">
                {badgeCount}
              </Text>
            </View>
          )}
          <ChevronRightIcon size={18} color="#9ca3af" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

function PermissionItem({ icon, title, value, onPress }: any) {
  return (
    <TouchableOpacity onPress={onPress} className="flex-row items-center p-5">
      <View className="w-10 h-10 bg-gray-50 rounded-xl items-center justify-center mr-4">
        {icon}
      </View>
      <View className="flex-1 justify-between">
        <Text className="text-[15px] font-medium text-gray-700">{title}</Text>
        <View className="flex-row items-center">
          <Text className="text-[13px] text-blue-500 mr-2 font-medium">
            {value}
          </Text>
        </View>
      </View>
      <ChevronRightIcon size={16} color="#9ca3af" />
    </TouchableOpacity>
  );
}

function MemberItem({ member, isSelected, onSelect }: any) {
  const [userName, setUserName] = useState("Người dùng");
  const [userAvatar, setUserAvatar] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await userService.getUserById(member.userId);
        if (res) {
          setUserName(res.fullName || "Người dùng");
          setUserAvatar(res.avatar || "");
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchUser();
  }, [member.userId]);

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      className={`flex-row items-center p-4 rounded-2xl mb-3 border ${
        isSelected ? "border-blue-500 bg-blue-50" : "border-gray-100 bg-white"
      }`}
      onPress={onSelect}
    >
      {userAvatar ? (
        <Image
          source={{ uri: userAvatar }}
          className="w-12 h-12 rounded-full"
        />
      ) : (
        <View className="w-12 h-12 bg-gray-800 rounded-full items-center justify-center">
          <Text className="text-white text-base font-bold">
            {userName.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View className="ml-4 flex-1">
        <Text
          className={`text-base font-bold ${isSelected ? "text-blue-900" : "text-gray-900"}`}
        >
          {userName}
        </Text>
        <Text className="text-xs text-gray-400 capitalize">
          {member.role?.toLowerCase()}
        </Text>
      </View>
      {isSelected && (
        <View className="bg-blue-500 rounded-full p-1">
          <CheckIcon size={16} color="white" />
        </View>
      )}
    </TouchableOpacity>
  );
}
