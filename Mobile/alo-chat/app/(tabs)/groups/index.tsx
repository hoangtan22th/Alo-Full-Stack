import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  AdjustmentsHorizontalIcon,
  ArrowDownTrayIcon,
  BellSlashIcon,
  ChatBubbleLeftIcon,
  CheckCircleIcon,
  EnvelopeIcon,
  EyeSlashIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  PaperAirplaneIcon,
  StarIcon,
  TrashIcon,
  UserPlusIcon,
} from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Mock data cho danh sách nhóm
const COMMUNITY_GROUPS = [
  {
    id: "1",
    name: "Thiết kế Sáng tạo Việt",
    avatar:
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=200&auto=format&fit=crop",
    subtitle: "852 thành viên • 2 tin nhắn mới",
  },
  {
    id: "2",
    name: "Startup Founders",
    avatar:
      "https://images.unsplash.com/photo-1556761175-4b46a572b786?q=80&w=200&auto=format&fit=crop",
    subtitle: "3.2k thành viên • Minh: Chào cả nhà, mình tên là Phan Tấn Duy",
  },
];

const PRIVATE_GROUPS = [
  {
    id: "3",
    name: "Team Leo Núi ⛰️",
    avatar:
      "https://images.unsplash.com/photo-1506869640319-ce1a44f07e59?q=80&w=200&auto=format&fit=crop",
    subtitle:
      "6 thành viên • Bạn: Đã chốt lịch cho hành trình vào tuần tới chưa?",
  },
  {
    id: "4",
    name: "Gia đình ❤️",
    avatar: null,
    initials: "GH",
    subtitle: "4 thành viên • Mẹ: Tối về ăn cơm nha",
  },
  {
    id: "5",
    name: "Dự án Q3-2024",
    avatar:
      "https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=200&auto=format&fit=crop",
    subtitle: "12 thành viên • Hùng đã gửi 1 tệp.",
  },
  {
    id: "6",
    name: "Dự án Q3-2024",
    avatar:
      "https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=200&auto=format&fit=crop",
    subtitle: "12 thành viên • Hùng đã gửi 1 tệp.",
  },
  {
    id: "7",
    name: "Dự án Q3-2024",
    avatar:
      "https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=200&auto=format&fit=crop",
    subtitle: "12 thành viên • Hùng đã gửi 1 tệp.",
  },
  {
    id: "8",
    name: "Dự án Q3-2024",
    avatar:
      "https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=200&auto=format&fit=crop",
    subtitle: "12 thành viên • Hùng đã gửi 1 tệp.",
  },
];

export default function GroupsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selectedGroup, setSelectedGroup] = useState<any>(null);

  return (
    // Sử dụng insets.top để tự động đẩy nội dung xuống dưới tai thỏ
    <View
      style={{ flex: 1, backgroundColor: "white", paddingTop: insets.top + 10 }}
    >
      {/* Thanh tìm kiếm */}
      <View className="border-b-[1px] border-gray-100 px-4">
        <View className="flex-row items-center bg-gray-50 rounded-2xl px-4 py-3 mb-2">
          <MagnifyingGlassIcon size={20} color="#9ca3af" />
          <TextInput
            placeholder="Tìm kiếm nhóm..."
            className="flex-1 ml-2 text-base text-gray-800"
            placeholderTextColor="#9ca3af"
          />
        </View>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        showsVerticalScrollIndicator={false}
      >
        {/* Các nút hành động */}
        <View className="flex-row justify-between mb-8 px-2">
          <ActionItem
            icon={<UserPlusIcon size={24} color="#374151" />}
            label="Tạo nhóm mới"
            onPress={() => router.push("/groups/create-group")}
          />
          <ActionItem
            icon={<EnvelopeIcon size={24} color="#374151" />}
            label="Lời mời vào nhóm"
          />
          <ActionItem
            icon={<PaperAirplaneIcon size={24} color="#374151" />}
            label="Lời mời đã gửi"
          />
          <ActionItem
            icon={<StarIcon size={24} color="#374151" />}
            label="Yêu thích"
          />
        </View>

        {/* Tiêu đề danh sách Nhóm & Nút Filter */}
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-lg font-bold text-gray-900">Nhóm (12)</Text>
          <TouchableOpacity>
            <AdjustmentsHorizontalIcon size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {/* Section: Cộng đồng */}
        <View className="mb-6">
          <Text className="text-xs font-bold text-gray-400 tracking-wider mb-4">
            CỘNG ĐỒNG
          </Text>
          {COMMUNITY_GROUPS.map((group) => (
            <GroupItem
              key={group.id}
              group={group}
              onLongPress={() => setSelectedGroup(group)}
            />
          ))}
        </View>

        {/* Section: Nhóm riêng */}
        <View className="pb-32">
          <Text className="text-xs font-bold text-gray-400 tracking-wider mb-4">
            NHÓM RIÊNG
          </Text>
          {PRIVATE_GROUPS.map((group) => (
            <GroupItem
              key={group.id}
              group={group}
              onLongPress={() => setSelectedGroup(group)}
            />
          ))}
        </View>
      </ScrollView>

      {/* Popup Menu khi bấm giữ */}
      <ActionMenuModal
        group={selectedGroup}
        visible={!!selectedGroup}
        onClose={() => setSelectedGroup(null)}
      />
    </View>
  );
}

// Component con: Nút bấm tròn
function ActionItem({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity className="items-center w-20" onPress={onPress}>
      <View className="w-14 h-14 bg-gray-50 rounded-full items-center justify-center mb-2">
        {icon}
      </View>
      <Text className="text-xs text-center text-gray-600 font-medium leading-4">
        {label.replace("\\n", "\n")}
      </Text>
    </TouchableOpacity>
  );
}

// Component con: Item nhóm
function GroupItem({
  group,
  onLongPress,
}: {
  group: any;
  onLongPress: () => void;
}) {
  return (
    // Thêm onLongPress vào TouchableOpacity
    <TouchableOpacity
      className="flex-row items-center mb-5"
      onLongPress={onLongPress}
      delayLongPress={250} // Thời gian giữ 0.25s để hiện menu
    >
      {group.avatar ? (
        <Image
          source={{ uri: group.avatar }}
          className="w-14 h-14 rounded-full"
        />
      ) : (
        <View className="w-14 h-14 rounded-full bg-gray-900 items-center justify-center">
          <Text className="text-white font-bold text-lg">{group.initials}</Text>
        </View>
      )}

      <View className="flex-1 ml-4 justify-center">
        <Text className="text-base font-bold text-gray-900 mb-1">
          {group.name}
        </Text>
        <Text className="text-sm text-gray-500" numberOfLines={1}>
          {group.subtitle}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// Component Menu Popup
function ActionMenuModal({
  group,
  visible,
  onClose,
}: {
  group: any;
  visible: boolean;
  onClose: () => void;
}) {
  if (!group) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* Lớp overlay làm mờ nền, bấm vào nền để đóng popup */}
      <Pressable
        className="flex-1 bg-black/40 justify-center px-6"
        onPress={onClose}
      >
        {/* Bọc nội dung để tránh bấm nhầm vào menu mà bị đóng popup */}
        <Pressable onPress={(e) => e.stopPropagation()}>
          {/* Card Header hiển thị thông tin người/nhóm được chọn */}
          <View className="bg-white rounded-[28px] p-4 mb-3 flex-row items-center shadow-lg">
            {group.avatar ? (
              <Image
                source={{ uri: group.avatar }}
                className="w-12 h-12 rounded-full"
              />
            ) : (
              <View className="w-12 h-12 rounded-full bg-gray-900 items-center justify-center">
                <Text className="text-white font-bold text-lg">
                  {group.initials}
                </Text>
              </View>
            )}
            <View className="flex-1 ml-3">
              <View className="flex-row justify-between items-center mb-1">
                <Text className="text-base font-bold text-gray-900">
                  {group.name}
                </Text>
                <Text className="text-xs text-gray-400">12:45 PM</Text>
              </View>
              <Text className="text-sm text-gray-500" numberOfLines={1}>
                {group.subtitle}
              </Text>
            </View>
          </View>

          {/* Card chứa danh sách các tính năng */}
          <View className="bg-white rounded-[28px] overflow-hidden shadow-lg">
            <MenuOption
              icon={<ChatBubbleLeftIcon size={22} color="#374151" />}
              label="Đánh dấu chưa đọc"
            />
            <MenuOption
              icon={<MapPinIcon size={22} color="#374151" />}
              label="Ghim"
            />
            <MenuOption
              icon={<BellSlashIcon size={22} color="#374151" />}
              label="Tắt thông báo"
            />
            <MenuOption
              icon={<ArrowDownTrayIcon size={22} color="#374151" />}
              label="Chuyển sang mục Khác"
            />
            <MenuOption
              icon={<EyeSlashIcon size={22} color="#374151" />}
              label="Ẩn"
            />
            <MenuOption
              icon={<TrashIcon size={22} color="#ef4444" />}
              label="Xóa"
              isDestructive
            />
            <MenuOption
              icon={<CheckCircleIcon size={22} color="#374151" />}
              label="Chọn nhiều"
              noBorder
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// Component con: Từng dòng tùy chọn trong Menu Popup
function MenuOption({
  icon,
  label,
  isDestructive = false,
  noBorder = false,
}: {
  icon: any;
  label: string;
  isDestructive?: boolean;
  noBorder?: boolean;
}) {
  return (
    <TouchableOpacity
      className={`flex-row items-center px-5 py-4 ${noBorder ? "" : "border-b border-gray-100"}`}
    >
      <View className="w-8 items-center justify-center">{icon}</View>
      <Text
        className={`text-base ml-2 ${isDestructive ? "text-red-500" : "text-gray-800"}`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
