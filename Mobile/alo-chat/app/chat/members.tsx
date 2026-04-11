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
  Alert,
  Modal,
  TextInput,
  Switch,
} from "react-native";
import {
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  UserPlusIcon,
  EllipsisVerticalIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  NoSymbolIcon,
  ChevronRightIcon,
  XMarkIcon,
} from "react-native-heroicons/outline";
import { PaperAirplaneIcon } from "react-native-heroicons/solid";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function GroupMembersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();

  // Đảm bảo lấy đúng trường ID từ đối tượng user trả về từ backend
  const currentUserId = user?.id || user?._id || user?.userId || null;

  const [members, setMembers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [searchFriend, setSearchFriend] = useState("");

  const [activeTab, setActiveTab] = useState<"all" | "managers" | "blocked">(
    "all",
  );
  const [canViewHistory, setCanViewHistory] = useState(false);

  const fetchGroupDetails = async () => {
    try {
      if (!id) return;
      const res = await groupService.getGroupById(id as string);

      let groupData = res;
      if (res?.data?.data) {
        groupData = res.data.data;
      } else if (res?.data) {
        groupData = res.data;
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
  const isManager = isAdmin || isDeputy;

  const handleAddMember = async () => {
    try {
      const friendList = await contactService.getFriendsList();
      const friendDataList = await Promise.all(
        friendList.map(async (f: any) => {
          const friendId =
            f.requesterId === currentUserId ? f.recipientId : f.requesterId;
          const userRes = await userService.getUserById(friendId);
          const userData =
            userRes && (userRes as any).data ? (userRes as any).data : userRes;
          return {
            id: friendId,
            name: userData?.fullName || "Người dùng",
            avatar: userData?.avatar || "",
          };
        }),
      );

      const existingMemberIds = members.map((m) => m.id);
      const availableFriends = friendDataList.filter(
        (f) => !existingMemberIds.includes(f.id),
      );

      setFriends(availableFriends);
      setSelectedFriendIds([]);
      setIsAddModalVisible(true);
    } catch (error) {
      console.error("Lỗi lấy danh sách bạn:", error);
      Alert.alert("Lỗi", "Không thể lấy danh sách bạn bè.");
    }
  };

  const handleConfirmAddMembers = async () => {
    if (selectedFriendIds.length === 0) {
      setIsAddModalVisible(false);
      return;
    }

    try {
      for (const friendId of selectedFriendIds) {
        await groupService.addMember(id as string, friendId);
      }
      Alert.alert("Thành công", "Đã thêm thành viên vào nhóm.");
      setIsAddModalVisible(false);
      fetchGroupDetails();
    } catch (error) {
      Alert.alert("Lỗi", "Không thể thêm một số thành viên.");
    }
  };

  const handleMemberAction = (member: any) => {
    if (!isManager) return;
    if (member.role === "leader") return;
    if (isDeputy && member.role === "deputy") return;

    const buttons = [];

    if (isAdmin) {
      buttons.push({
        text: "Trao quyền trưởng nhóm",
        onPress: () => handleAssignLeader(member.id),
      });

      buttons.push({
        text:
          member.role === "deputy" ? "Thu hồi phó nhóm" : "Trao quyền phó nhóm",
        onPress: () =>
          handlePromote(
            member.id,
            member.role === "deputy" ? "MEMBER" : "DEPUTY",
          ),
      });
    }

    buttons.push({
      text: "Xóa khỏi nhóm",
      onPress: () => handleKickMember(member.id, member.name),
      style: "destructive" as any,
    });

    buttons.push({ text: "Hủy", style: "cancel" as any });

    Alert.alert(`Quản lý ${member.name}`, "Chọn hành động:", buttons);
  };

  const handlePromote = async (memberId: string, newRole: string) => {
    try {
      await groupService.updateRole(id as string, memberId, newRole);
      Alert.alert("Thành công", "Đã cập nhật quyền thành viên.");
      fetchGroupDetails();
    } catch (error) {
      Alert.alert("Lỗi", "Không thể cập nhật quyền.");
    }
  };

  const handleAssignLeader = (memberId: string) => {
    Alert.alert(
      "Chuyển nhượng trưởng nhóm",
      "Bạn có chắc chắn muốn chuyển nhượng trưởng nhóm? Bạn sẽ trở thành thành viên thường.",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xác nhận",
          onPress: async () => {
            try {
              await groupService.assignLeader(id as string, memberId);
              Alert.alert("Thành công", "Đã chuyển nhượng quyền trưởng nhóm.");
              fetchGroupDetails();
            } catch (error) {
              Alert.alert("Lỗi", "Không thể chuyển nhượng trưởng nhóm.");
            }
          },
        },
      ],
    );
  };

  const handleKickMember = (memberId: string, memberName: string) => {
    Alert.alert(
      "Xác nhận xóa",
      `Bạn có chắc chắn muốn xóa ${memberName} khỏi nhóm?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              await groupService.removeMember(id as string, memberId);
              Alert.alert("Thành công", "Đã xóa thành viên khỏi nhóm.");
              fetchGroupDetails();
            } catch (error) {
              Alert.alert("Lỗi", "Không thể xóa thành viên.");
            }
          },
        },
      ],
    );
  };

  const filteredMembers = members.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const getDisplayedMembers = () => {
    if (activeTab === "all") return filteredMembers;
    if (activeTab === "managers")
      return filteredMembers.filter(
        (m) => m.role === "leader" || m.role === "deputy",
      );
    if (activeTab === "blocked") return []; // Tạm thời để trống
    return [];
  };

  return (
    <View className="flex-1 bg-[#fcfcfc]" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 -ml-2 mr-2"
          >
            <ArrowLeftIcon size={24} color="#000" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-900">Thành viên</Text>
        </View>
        <View className="flex-row">
          <TouchableOpacity className="p-2 mr-2" onPress={handleAddMember}>
            <UserPlusIcon size={24} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity
            className="p-2 -mr-2"
            onPress={() => {
              /* Toggle Search */
            }}
          >
            <MagnifyingGlassIcon size={24} color="#000" />
          </TouchableOpacity>
        </View>
      </View>

      <View className="px-4 py-2">
        <View className="bg-gray-100 rounded-lg px-4 py-2 flex-row items-center">
          <MagnifyingGlassIcon size={20} color="#9ca3af" />
          <TextInput
            placeholder="Tìm kiếm thành viên..."
            className="flex-1 ml-2 text-[15px] p-0"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {isManager && (
        <View className="flex-row px-4 py-2 border-b border-gray-100 gap-4">
          <TouchableOpacity onPress={() => setActiveTab("all")}>
            <Text
              className={`text-[15px] font-medium pb-2 ${activeTab === "all" ? "text-blue-500 border-b-2 border-blue-500" : "text-gray-500"}`}
            >
              Tất cả
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab("managers")}>
            <Text
              className={`text-[15px] font-medium pb-2 ${activeTab === "managers" ? "text-blue-500 border-b-2 border-blue-500" : "text-gray-500"}`}
            >
              Trưởng nhóm và phó nhóm
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab("blocked")}>
            <Text
              className={`text-[15px] font-medium pb-2 ${activeTab === "blocked" ? "text-blue-500 border-b-2 border-blue-500" : "text-gray-500"}`}
            >
              Đã chặn
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {isManager && activeTab === "all" && (
          <TouchableOpacity
            className="px-5 py-4 border-b border-gray-100 flex-row items-center justify-between"
            onPress={() => router.push(`/chat/pending-members?id=${id}`)}
          >
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mr-4">
                <ShieldCheckIcon size={24} color="#3b82f6" />
              </View>
              <Text className="text-[16px] font-medium text-gray-800">
                Duyệt thành viên
              </Text>
            </View>
            <ChevronRightIcon size={20} color="#9ca3af" />
          </TouchableOpacity>
        )}

        <View className="mt-2">
          {getDisplayedMembers().map((member) => (
            <TouchableOpacity
              key={member.id}
              className="flex-row items-center p-4 py-3 border-b border-gray-50"
              activeOpacity={0.7}
              onPress={() => handleMemberAction(member)}
            >
              {member.avatar ? (
                <Image
                  source={{ uri: member.avatar }}
                  className="w-12 h-12 rounded-full bg-gray-200"
                />
              ) : (
                <View className="w-12 h-12 rounded-full bg-gray-800 items-center justify-center">
                  <Text className="text-white font-bold text-lg">
                    {member.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View className="ml-4 flex-1">
                <Text className="text-[16px] font-medium text-gray-800">
                  {member.name}
                </Text>
                {member.role === "leader" && (
                  <Text className="text-[13px] text-blue-600 font-medium">
                    Trưởng nhóm
                  </Text>
                )}
                {member.role === "deputy" && (
                  <Text className="text-[13px] text-green-600 font-medium">
                    Phó nhóm
                  </Text>
                )}
              </View>
              {isManager && <EllipsisVerticalIcon size={24} color="#9ca3af" />}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Modal Thêm thành viên */}
      <Modal
        visible={isAddModalVisible}
        animationType="slide"
        transparent={false}
      >
        <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
          {/* Header */}
          <View className="flex-row items-center border-b border-gray-100 px-4 pb-3">
            <TouchableOpacity
              onPress={() => setIsAddModalVisible(false)}
              className="p-2 -ml-2"
            >
              <XMarkIcon size={24} color="#000" />
            </TouchableOpacity>
            <View className="ml-2 flex-1">
              <Text className="text-lg font-bold text-gray-900">
                Thêm vào nhóm
              </Text>
              <Text className="text-[13px] text-gray-500">
                Đã chọn: {selectedFriendIds.length}
              </Text>
            </View>
          </View>

          {/* Search */}
          <View className="px-4 py-3">
            <View className="bg-gray-100 rounded-full px-4 py-2 flex-row items-center">
              <MagnifyingGlassIcon size={20} color="#9ca3af" />
              <TextInput
                placeholder="Tìm kiếm bạn bè..."
                className="flex-1 ml-2 text-[15px] p-0"
                value={searchFriend}
                onChangeText={setSearchFriend}
              />
            </View>
          </View>

          {/* Friend List */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            className="flex-1 px-4"
          >
            {friends
              .filter((f) =>
                f.name.toLowerCase().includes(searchFriend.toLowerCase()),
              )
              .map((friend) => {
                const isSelected = selectedFriendIds.includes(friend.id);
                return (
                  <TouchableOpacity
                    key={friend.id}
                    className="flex-row items-center py-3 border-b border-gray-50"
                    onPress={() => {
                      if (isSelected) {
                        setSelectedFriendIds(
                          selectedFriendIds.filter((fid) => fid !== friend.id),
                        );
                      } else {
                        setSelectedFriendIds([...selectedFriendIds, friend.id]);
                      }
                    }}
                  >
                    <View
                      className={`w-5 h-5 rounded-full border mr-4 items-center justify-center ${
                        isSelected
                          ? "bg-blue-500 border-blue-500"
                          : "border-gray-300"
                      }`}
                    >
                      {isSelected && (
                        <View className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </View>
                    {friend.avatar ? (
                      <Image
                        source={{ uri: friend.avatar }}
                        className="w-12 h-12 rounded-full bg-gray-200"
                      />
                    ) : (
                      <View className="w-12 h-12 rounded-full bg-gray-800 items-center justify-center">
                        <Text className="text-white font-bold text-lg">
                          {friend.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <Text className="ml-4 text-[16px] font-medium text-gray-800 flex-1">
                      {friend.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            {friends.length === 0 && (
              <View className="items-center justify-center py-10">
                <Text className="text-gray-500">
                  Tất cả bạn bè đã ở trong nhóm
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Bottom Fixed Panel */}
          {selectedFriendIds.length > 0 && (
            <View
              className="border-t border-gray-100 bg-white pt-3"
              style={{ paddingBottom: insets.bottom > 0 ? insets.bottom : 16 }}
            >
              {/* Selected avatars + Send Button */}
              <View className="flex-row items-center px-4 mb-3">
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="flex-1 mr-3"
                >
                  {friends
                    .filter((f) => selectedFriendIds.includes(f.id))
                    .map((selectedFriend) => (
                      <TouchableOpacity
                        key={selectedFriend.id}
                        className="mr-3 relative"
                        onPress={() =>
                          setSelectedFriendIds(
                            selectedFriendIds.filter(
                              (id) => id !== selectedFriend.id,
                            ),
                          )
                        }
                      >
                        {selectedFriend.avatar ? (
                          <Image
                            source={{ uri: selectedFriend.avatar }}
                            className="w-12 h-12 rounded-full bg-gray-200"
                          />
                        ) : (
                          <View className="w-12 h-12 rounded-full bg-gray-800 items-center justify-center">
                            <Text className="text-white font-bold text-lg">
                              {selectedFriend.name.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        )}
                        <View className="absolute top-0 right-0 w-4 h-4 bg-gray-300 rounded-full items-center justify-center border border-white">
                          <XMarkIcon size={10} color="#000" />
                        </View>
                      </TouchableOpacity>
                    ))}
                </ScrollView>
                <TouchableOpacity
                  onPress={handleConfirmAddMembers}
                  className="w-12 h-12 bg-blue-500 rounded-full items-center justify-center"
                >
                  <PaperAirplaneIcon size={24} color="#FFF" />
                </TouchableOpacity>
              </View>
              {/* Toggle new members can view recent messages history */}
              <View className="flex-row items-center justify-between px-4 mt-2">
                <Text className="text-[15px] text-gray-700 font-medium">
                  Thành viên mới xem được tin gửi gần đây
                </Text>
                <Switch
                  value={canViewHistory}
                  onValueChange={setCanViewHistory}
                  trackColor={{ false: "#e5e7eb", true: "#3b82f6" }}
                  thumbColor={"#ffffff"}
                />
              </View>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}
