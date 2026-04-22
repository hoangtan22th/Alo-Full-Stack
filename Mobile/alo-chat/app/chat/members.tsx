import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import { groupService } from "../../services/groupService";
import { userService } from "../../services/userService";
import { contactService } from "../../services/contactService";
import { useAuth } from "../../contexts/AuthContext";
import { useSocket } from "../../contexts/SocketContext";
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
  DocumentDuplicateIcon,
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
  const [canViewHistory, setCanViewHistory] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  // States cho kick thành viên
  const [isKickModalVisible, setIsKickModalVisible] = useState(false);
  const [targetKickMember, setTargetKickMember] = useState<{id: string, name: string} | null>(null);
  const [isKickBanned, setIsKickBanned] = useState(false);

  // States cho tìm kiếm SĐT
  const [isPhoneSearchActive, setIsPhoneSearchActive] = useState(false);
  const [phoneSearchQuery, setPhoneSearchQuery] = useState("");
  const [phoneSearchResult, setPhoneSearchResult] = useState<any>(null);
  const [isSearchingPhone, setIsSearchingPhone] = useState(false);

  const [blockedMembers, setBlockedMembers] = useState<any[]>([]);
  const [groupName, setGroupName] = useState("");

  // Friendship states
  const [friendshipStatuses, setFriendshipStatuses] = useState<Record<string, "friend" | "sent" | "received" | "none">>({});

  const fetchFriendshipData = async () => {
    try {
      const [friendsList, sentRequests, pendingRequests] = await Promise.all([
        contactService.getFriendsList(),
        contactService.getSentRequests(),
        contactService.getPendingRequests(),
      ]);

      const statuses: Record<string, "friend" | "sent" | "received" | "none"> = {};

      friendsList.forEach((f: any) => {
        const friendId = f.requesterId === currentUserId ? f.recipientId : f.requesterId;
        statuses[friendId] = "friend";
      });

      sentRequests.forEach((r: any) => {
        statuses[r.recipientId] = "sent";
      });

      pendingRequests.forEach((r: any) => {
        statuses[r.requesterId] = "received";
      });

      setFriendshipStatuses(statuses);
    } catch (error) {
      console.error("Lỗi lấy thông tin bạn bè:", error);
    }
  };

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
        setGroupName(groupData.name || "");
        setPendingCount(groupData.joinRequests?.length || 0);
        if (typeof groupData.isHistoryVisible === "boolean") {
          setCanViewHistory(groupData.isHistoryVisible);
        }
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

        // Lấy danh sách thành viên bị chặn
        if (groupData.removedMembers) {
          const bannedOnes = groupData.removedMembers.filter((rm: any) => rm.isBanned);
          const blockedList = await Promise.all(
            bannedOnes.map(async (rm: any) => {
              const userRes = await userService.getUserById(rm.userId);
              const userData = userRes && (userRes as any).data ? (userRes as any).data : userRes;
              return {
                id: rm.userId,
                name: userData?.fullName || "Người dùng",
                avatar: userData?.avatar || "",
                role: "blocked",
              };
            })
          );
          setBlockedMembers(blockedList);
        }
      }
    } catch (error) {
      console.error("Lỗi lấy chi tiết nhóm:", error);
    }
  };

  const { socket } = useSocket();

  useEffect(() => {
    fetchGroupDetails();
    fetchFriendshipData();
  }, [id, currentUserId]);

  useEffect(() => {
    if (!socket || !id) return;

    // Lắng nghe yêu cầu tham gia mới (để cập nhật số lượng chờ duyệt)
    const handleNewJoinRequest = (data: { groupId: string }) => {
      console.log("📥 [Members] Received NEW_JOIN_REQUEST:", data.groupId);
      if (data.groupId === id) {
        fetchGroupDetails();
      }
    };

    // Lắng nghe thay đổi thông tin nhóm (thêm thành viên, đổi role...)
    const handleGroupUpdated = (data: any) => {
      const updatedId = data._id || data.id || data.conversationId;
      console.log("🔄 [Members] Received GROUP_UPDATED:", updatedId);
      if (String(updatedId) === String(id)) {
        fetchGroupDetails();
      }
    };

    // Lắng nghe nếu bị mời khỏi nhóm hoặc nhóm giải tán
    const handleConversationRemoved = (data: {
      conversationId: string;
      groupName: string;
      reason: string;
    }) => {
      console.log("🔴 [Members] Received CONVERSATION_REMOVED:", data);
      if (data.conversationId === id && data.reason !== "leave") {
        Alert.alert(
          "Thông báo",
          data.reason === "delete"
            ? `Nhóm ${data.groupName} đã được giải tán`
            : `Bạn đã bị mời ra khỏi nhóm ${data.groupName}`,
          [{ text: "OK", onPress: () => {
            if (router.canDismiss()) {
              router.dismissAll();
            }
            router.replace("/(tabs)");
          }}]
        );
      }
    };

    socket.on("NEW_JOIN_REQUEST", handleNewJoinRequest);
    socket.on("GROUP_UPDATED", handleGroupUpdated);
    socket.on("CONVERSATION_REMOVED", handleConversationRemoved);

    return () => {
      socket.off("NEW_JOIN_REQUEST", handleNewJoinRequest);
      socket.off("GROUP_UPDATED", handleGroupUpdated);
      socket.off("CONVERSATION_REMOVED", handleConversationRemoved);
    };
  }, [socket, id]);

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
      // Dùng canViewHistory làm một override duy nhất cho đợt thêm này
      for (const friendId of selectedFriendIds) {
        await groupService.addMember(id as string, friendId, canViewHistory);
      }
      Alert.alert("Thành công", "Đã thêm thành viên vào nhóm.");
      
      // Reset về trạng thái mặc định của nhóm sau khi thêm xong
      // ( fetchGroupDetails sẽ cập nhật lại canViewHistory từ groupData.isHistoryVisible )
      setIsAddModalVisible(false);
      fetchGroupDetails();
      setSelectedFriendIds([]);
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

  const handleUnblock = async (memberId: string, memberName: string) => {
    Alert.alert(
      "Gỡ chặn",
      `Bạn có chắc chắn muốn gỡ chặn cho ${memberName}?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xác nhận",
          onPress: async () => {
            try {
              await groupService.unblockMember(id as string, memberId);
              Alert.alert("Thành công", "Đã gỡ chặn thành viên.");
              fetchGroupDetails();
            } catch (error) {
              Alert.alert("Lỗi", "Không thể gỡ chặn thành viên.");
            }
          },
        },
      ],
    );
  };

  const handleKickMember = (memberId: string, memberName: string) => {
    setTargetKickMember({ id: memberId, name: memberName });
    setIsKickBanned(false);
    setIsKickModalVisible(true);
  };

  const confirmKickMember = async () => {
    if (!targetKickMember) return;
    try {
      await groupService.removeMember(id as string, targetKickMember.id, {
        isBanned: isKickBanned,
      });
      Alert.alert("Thành công", `Đã xóa ${targetKickMember.name} khỏi nhóm.`);
      setIsKickModalVisible(false);
      setTargetKickMember(null);
      fetchGroupDetails();
    } catch (error) {
      Alert.alert("Lỗi", "Không thể xóa thành viên.");
    }
  };

  const handleSendFriendRequest = (member: any) => {
    router.push({
      pathname: "/(tabs)/contacts/send-request",
      params: {
        userId: member.id,
        fullName: member.name,
        avatarUrl: member.avatar,
        from: "chat",
        chatId: id as string,
      },
    });
  };

  const handleCopyGroup = () => {
    const memberIds = members.map((m) => m.id).join(",");
    router.push({
      pathname: "/groups/create-group",
      params: {
        initialMemberIds: memberIds,
        initialGroupName: `${groupName} (Copy)`,
      },
    });
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
    if (activeTab === "blocked") return blockedMembers;
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
          <TouchableOpacity className="p-2 mr-2" onPress={handleCopyGroup}>
            <DocumentDuplicateIcon size={24} color="#000" />
          </TouchableOpacity>
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
            <View className="flex-row items-center">
              {pendingCount > 0 && (
                <View className="bg-red-500 min-w-[20px] h-5 rounded-full items-center justify-center px-1.5 mr-2">
                  <Text className="text-white text-[12px] font-bold">
                    {pendingCount}
                  </Text>
                </View>
              )}
              <ChevronRightIcon size={20} color="#9ca3af" />
            </View>
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
                {activeTab === "blocked" && (
                  <Text className="text-[13px] text-red-500 font-medium">
                    Đã chặn
                  </Text>
                )}
              </View>
              {activeTab === "blocked" ? (
                <TouchableOpacity
                  onPress={() => handleUnblock(member.id, member.name)}
                  className="bg-blue-50 px-3 py-1.5 rounded-full"
                >
                  <Text className="text-blue-600 text-[13px] font-bold">Gỡ chặn</Text>
                </TouchableOpacity>
              ) : (
                <View className="flex-row items-center">
                  {member.id !== currentUserId && !friendshipStatuses[member.id] && (
                    <TouchableOpacity
                      onPress={() => handleSendFriendRequest(member)}
                      className="p-2 mr-1"
                    >
                      <UserPlusIcon size={24} color="#3b82f6" />
                    </TouchableOpacity>
                  )}
                  {friendshipStatuses[member.id] === "sent" && (
                    <View className="bg-gray-100 px-2 py-1 rounded-md mr-2">
                      <Text className="text-[11px] text-gray-500 font-medium">Đã mời</Text>
                    </View>
                  )}
                  {isManager && (
                    <TouchableOpacity onPress={() => handleMemberAction(member)} className="p-2">
                       <EllipsisVerticalIcon size={24} color="#9ca3af" />
                    </TouchableOpacity>
                  )}
                </View>
              )}
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

          {/* Search Type Toggle */}
          <View className="flex-row px-4 mb-4">
            <TouchableOpacity
              onPress={() => setIsPhoneSearchActive(false)}
              className={`flex-1 py-2 rounded-l-xl items-center border ${!isPhoneSearchActive ? "bg-blue-500 border-blue-500" : "bg-white border-gray-200"}`}
            >
              <Text className={`font-bold ${!isPhoneSearchActive ? "text-white" : "text-gray-500"}`}>Bạn bè</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setIsPhoneSearchActive(true)}
              className={`flex-1 py-2 rounded-r-xl items-center border-y border-r ${isPhoneSearchActive ? "bg-blue-500 border-blue-500" : "bg-white border-gray-200"}`}
            >
              <Text className={`font-bold ${isPhoneSearchActive ? "text-white" : "text-gray-500"}`}>Tìm quanh đây/SĐT</Text>
            </TouchableOpacity>
          </View>

          {!isPhoneSearchActive ? (
            <>
              {/* Search Friend */}
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
              <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-4">
                {friends
                  .filter((f) => f.name.toLowerCase().includes(searchFriend.toLowerCase()))
                  .map((friend) => {
                    const isSelected = selectedFriendIds.includes(friend.id);
                    return (
                      <TouchableOpacity
                        key={friend.id}
                        className="flex-row items-center py-3 border-b border-gray-50"
                        onPress={() => {
                          if (isSelected) {
                            setSelectedFriendIds(selectedFriendIds.filter((fid) => fid !== friend.id));
                          } else {
                            setSelectedFriendIds([...selectedFriendIds, friend.id]);
                          }
                        }}
                      >
                        <View className={`w-5 h-5 rounded-full border mr-4 items-center justify-center ${isSelected ? "bg-blue-500 border-blue-500" : "border-gray-300"}`}>
                          {isSelected && <View className="w-2 h-2 rounded-full bg-white" />}
                        </View>
                        {friend.avatar ? (
                          <Image source={{ uri: friend.avatar }} className="w-12 h-12 rounded-full bg-gray-200" />
                        ) : (
                          <View className="w-12 h-12 rounded-full bg-gray-800 items-center justify-center">
                            <Text className="text-white font-bold text-lg">{friend.name.charAt(0).toUpperCase()}</Text>
                          </View>
                        )}
                        <Text className="ml-4 text-[16px] font-medium text-gray-800 flex-1">{friend.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                {friends.length === 0 && (
                  <View className="items-center justify-center py-10">
                    <Text className="text-gray-500">Tất cả bạn bè đã ở trong nhóm</Text>
                  </View>
                )}
              </ScrollView>
            </>
          ) : (
            <View className="flex-1 px-4">
              <View className="bg-gray-100 rounded-xl px-4 py-3 flex-row items-center mb-6">
                <TextInput
                  placeholder="Nhập số điện thoại..."
                  keyboardType="phone-pad"
                  className="flex-1 text-[16px]"
                  value={phoneSearchQuery}
                  onChangeText={setPhoneSearchQuery}
                />
                <TouchableOpacity
                  onPress={async () => {
                    if (!phoneSearchQuery) return;
                    setIsSearchingPhone(true);
                    try {
                      const results = await userService.searchByPhone(phoneSearchQuery);
                      if (results && results.length > 0) {
                        setPhoneSearchResult(results[0]);
                      } else {
                        setPhoneSearchResult(null);
                        Alert.alert("Thông báo", "Không tìm thấy người dùng này");
                      }
                    } catch (err) {
                      Alert.alert("Lỗi", "Không thể tìm kiếm");
                    } finally {
                      setIsSearchingPhone(false);
                    }
                  }}
                  disabled={isSearchingPhone}
                >
                  <Text className="text-blue-500 font-bold ml-2">Tìm</Text>
                </TouchableOpacity>
              </View>

              {phoneSearchResult && (
                <View className="items-center bg-gray-50 p-6 rounded-3xl">
                  {phoneSearchResult.avatar ? (
                    <Image source={{ uri: phoneSearchResult.avatar }} className="w-20 h-20 rounded-full mb-4" />
                  ) : (
                    <View className="w-20 h-20 rounded-full bg-gray-800 items-center justify-center mb-4">
                      <Text className="text-white font-bold text-2xl">{phoneSearchResult.fullName.charAt(0).toUpperCase()}</Text>
                    </View>
                  )}
                  <Text className="text-xl font-bold text-gray-900 mb-1">{phoneSearchResult.fullName}</Text>
                  <Text className="text-gray-500 mb-6">{phoneSearchResult.phoneNumber}</Text>

                  {members.some(m => String(m.id) === String(phoneSearchResult.id)) ? (
                    <View className="bg-gray-200 px-6 py-2 rounded-full">
                      <Text className="text-gray-500 font-bold">Đã vào nhóm</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={async () => {
                        try {
                          // Kiểm tra xem có là bạn bè không
                          const friendList = await contactService.getFriendsList();
                          const isFriend = friendList.some((f: any) => 
                            String(f.requesterId) === String(phoneSearchResult.id) || 
                            String(f.recipientId) === String(phoneSearchResult.id)
                          );

                          if (isFriend) {
                            await groupService.addMember(id as string, phoneSearchResult.id, canViewHistory);
                            Alert.alert("Thành công", "Đã thêm vào nhóm");
                          } else {
                            await groupService.inviteToGroup(id as string, phoneSearchResult.id);
                            Alert.alert("Đã gửi lời mời", "Lời mời vào nhóm đã được gửi tới người này");
                          }
                          setIsAddModalVisible(false);
                          fetchGroupDetails();
                        } catch (err) {
                          Alert.alert("Lỗi", "Thao tác thất bại");
                        }
                      }}
                      className="bg-blue-500 px-10 py-3 rounded-full shadow-sm"
                    >
                      <Text className="text-white font-bold text-lg">Mời vào nhóm</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          )}

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
            {isManager && (
              <View className="flex-row items-center justify-between px-4 mt-4 mb-2">
                <View className="flex-1 mr-4">
                  <Text className="text-[15px] text-gray-700 font-medium">
                    Xem lại tin nhắn cũ
                  </Text>
                  <Text className="text-[12px] text-gray-500">
                    Cho phép thành viên mới này thấy lịch sử hội thoại
                  </Text>
                </View>
                <Switch
                  value={canViewHistory}
                  onValueChange={setCanViewHistory}
                  trackColor={{ false: "#e5e7eb", true: "#3b82f6" }}
                  thumbColor={"#ffffff"}
                />
              </View>
            )}
            </View>
          )}
        </View>
      </Modal>

      {/* Modal Kick Thành Viên */}
      <Modal visible={isKickModalVisible} transparent animationType="fade">
        <View className="flex-1 bg-black/50 items-center justify-center px-6">
          <View className="bg-white w-full rounded-[24px] p-6">
            <Text className="text-xl font-bold text-gray-900 mb-2">Xác nhận xóa</Text>
            <Text className="text-gray-500 mb-6 font-medium">
              Bạn có chắc chắn muốn mời <Text className="font-bold text-gray-900">{targetKickMember?.name}</Text> ra khỏi nhóm?
            </Text>

            <TouchableOpacity
              onPress={() => setIsKickBanned(!isKickBanned)}
              className="flex-row items-center mb-8"
            >
              <View className={`w-6 h-6 rounded border items-center justify-center mr-3 ${isKickBanned ? "bg-red-500 border-red-500" : "border-gray-300"}`}>
                {isKickBanned && <View className="w-2.5 h-2.5 bg-white rounded-sm" />}
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-gray-800">Chặn người này vào lại nhóm</Text>
                <Text className="text-[12px] text-gray-500">Sau khi bị xóa, người này sẽ không thể tham gia lại bằng link hoặc lời mời</Text>
              </View>
            </TouchableOpacity>

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setIsKickModalVisible(false)}
                className="flex-1 bg-gray-100 py-3.5 rounded-2xl items-center"
              >
                <Text className="font-bold text-gray-700">Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmKickMember}
                className="flex-1 bg-red-500 py-3.5 rounded-2xl items-center shadow-sm"
              >
                <Text className="font-bold text-white">Xóa</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
