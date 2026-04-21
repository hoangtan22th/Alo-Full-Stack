import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  Image,
  Alert,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { ArrowLeftIcon, IdentificationIcon, ShieldCheckIcon, ChatBubbleBottomCenterTextIcon } from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { groupService } from "../../services/groupService";
import { userService } from "../../services/userService";
import { useSocket } from "../../contexts/SocketContext";

export default function PendingMembersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const conversationId = Array.isArray(id) ? id[0] : id;

  const [isApprovalRequired, setIsApprovalRequired] = useState(false);
  const [isQuestionEnabled, setIsQuestionEnabled] = useState(false);
  const [membershipQuestion, setMembershipQuestion] = useState("");
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    if (!conversationId) return;
    setLoading(true);
    try {
      // 1. Lấy thông tin group
      const groupRes = await groupService.getGroupById(conversationId);
      let groupData = groupRes;
      if (groupRes?.data?.data) groupData = groupRes.data.data;
      else if (groupRes?.data) groupData = groupRes.data;

      if (groupData) {
        setIsApprovalRequired(groupData.isApprovalRequired || false);
        setIsQuestionEnabled(groupData.isQuestionEnabled || false);
        setMembershipQuestion(groupData.membershipQuestion || "");
      }

      // 2. Lấy danh sách join requests
      const requestsRes = await groupService.getJoinRequests(conversationId);
      let requests = requestsRes;
      if (requestsRes?.data?.data) requests = requestsRes.data.data;
      else if (requestsRes?.data) requests = requestsRes.data;

      if (Array.isArray(requests)) {
        // 3. Gắn thông tin user
        const usersWithDetails = await Promise.all(
          requests.map(async (req: any) => {
            const userRes = await userService.getUserById(req.userId);
            const userData =
              userRes && (userRes as any).data
                ? (userRes as any).data
                : userRes;
            return {
              id: req.userId,
              name: userData?.fullName || "Người dùng",
              avatar: userData?.avatar || "",
              requestedAt: req.requestedAt,
              answer: req.answer || "",
            };
          }),
        );
        setPendingUsers(usersWithDetails);
      } else {
        setPendingUsers([]);
      }
    } catch (error) {
      console.error("Lỗi lấy thông tin duyệt thành viên:", error);
      Alert.alert("Lỗi", "Không thể tải danh sách chờ duyệt.");
    } finally {
      setLoading(false);
    }
  };

  const { socket } = useSocket();

  useEffect(() => {
    fetchData();
  }, [conversationId]);

  useEffect(() => {
    if (!socket || !conversationId) return;

    // Join room để nhận thông báo realtime cho group này
    socket.emit("joinRoom", conversationId);

    // Lắng nghe yêu cầu tham gia mới
    const handleNewJoinRequest = (data: { groupId: string }) => {
      console.log("📥 [Pending] Received NEW_JOIN_REQUEST:", data.groupId);
      if (String(data.groupId) === String(conversationId)) {
        fetchData();
      }
    };

    // Lắng nghe cập nhật thông tin hội thoại/nhóm
    const handleUpdate = (data: any) => {
      const updatedId = data._id || data.id || data.conversationId;
      console.log("🔄 [Pending] Received UPDATE event:", updatedId);
      if (String(updatedId) === String(conversationId)) {
        fetchData();
      }
    };

    socket.on("NEW_JOIN_REQUEST", handleNewJoinRequest);
    socket.on("GROUP_UPDATED", handleUpdate);
    socket.on("CONVERSATION_UPDATED", handleUpdate);

    return () => {
      socket.off("NEW_JOIN_REQUEST", handleNewJoinRequest);
      socket.off("GROUP_UPDATED", handleUpdate);
      socket.off("CONVERSATION_UPDATED", handleUpdate);
    };
  }, [socket, conversationId]);

  const toggleApproval = async (newValue: boolean) => {
    if (!conversationId) return;
    try {
      setIsApprovalRequired(newValue);
      await groupService.updateApprovalSetting(conversationId, newValue);
      
      // Nếu tắt phê duyệt, tự động tắt luôn câu hỏi tham gia
      if (!newValue && isQuestionEnabled) {
        setIsQuestionEnabled(false);
        await groupService.updateGroupSettings(conversationId, {
          isQuestionEnabled: false,
        });
      }
    } catch (error) {
      console.error("Lỗi cập nhật cài đặt duyệt:", error);
      Alert.alert("Lỗi", "Cập nhật thất bại. Vui lòng thử lại.");
      setIsApprovalRequired(!newValue); // rollback state
    }
  };

  const toggleQuestion = async (newValue: boolean) => {
    if (!conversationId || !isApprovalRequired) return;
    try {
      setIsQuestionEnabled(newValue);
      await groupService.updateGroupSettings(conversationId, {
        isQuestionEnabled: newValue,
      });
    } catch (error) {
      console.error("Lỗi cập nhật câu hỏi:", error);
      Alert.alert("Lỗi", "Cập nhật thất bại.");
      setIsQuestionEnabled(!newValue);
    }
  };

  const saveQuestion = async () => {
    if (!conversationId) return;
    try {
      await groupService.updateGroupSettings(conversationId, {
        membershipQuestion,
      });
      Alert.alert("Thành công", "Đã lưu câu hỏi tham gia.");
    } catch (error) {
      console.error("Lỗi lưu câu hỏi:", error);
      Alert.alert("Lỗi", "Lưu câu hỏi thất bại.");
    }
  };

  const handleApprove = async (userId: string) => {
    if (!conversationId) return;
    try {
      await groupService.approveJoinRequest(conversationId, userId);
      fetchData();
    } catch (error) {
      console.error("Lỗi phê duyệt:", error);
      Alert.alert("Lỗi", "Phê duyệt thất bại.");
    }
  };

  const handleReject = async (userId: string) => {
    if (!conversationId) return;
    try {
      await groupService.rejectJoinRequest(conversationId, userId);
      fetchData();
    } catch (error) {
      console.error("Lỗi từ chối:", error);
      Alert.alert("Lỗi", "Từ chối thất bại.");
    }
  };

  return (
    <View className="flex-1 bg-[#fcfcfc]" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100 bg-white">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ArrowLeftIcon size={24} color="#000" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900">
          Duyệt thành viên
        </Text>
        <View className="w-10" />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {/* Toggle Approval */}
        <View className="px-5 py-6 bg-white border-b border-gray-50 flex-row items-center justify-between">
          <View className="flex-1 pr-6">
            <View className="flex-row items-center mb-1.5">
              <ShieldCheckIcon size={20} color="#3b82f6" />
              <Text className="text-[16px] font-bold text-gray-900 ml-2">
                Phê duyệt thành viên
              </Text>
            </View>
            <Text className="text-[13px] text-gray-500 leading-5">
              Mọi người cần được Admin phê duyệt để tham gia nhóm.
            </Text>
          </View>
          <Switch
            trackColor={{ false: "#e5e7eb", true: "#3b82f6" }}
            thumbColor={"#ffffff"}
            onValueChange={toggleApproval}
            value={isApprovalRequired}
          />
        </View>

        {/* Toggle Question */}
        <View className="px-5 py-6 bg-white border-b border-gray-100">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-1 pr-6">
              <View className="flex-row items-center mb-1.5">
                <IdentificationIcon size={20} color={!isApprovalRequired ? "#d1d5db" : "#6b7280"} />
                <Text className={`text-[16px] font-bold ml-2 ${!isApprovalRequired ? 'text-gray-300' : 'text-gray-900'}`}>
                  Câu hỏi tham gia
                </Text>
              </View>
              <Text className={`text-[13px] leading-5 ${!isApprovalRequired ? 'text-gray-300' : 'text-gray-500'}`}>
                Yêu cầu trả lời câu hỏi trước khi gửi yêu cầu tham gia.
              </Text>
            </View>
            <Switch
              trackColor={{ false: "#e5e7eb", true: "#3b82f6" }}
              thumbColor={"#ffffff"}
              onValueChange={toggleQuestion}
              value={isQuestionEnabled}
              disabled={!isApprovalRequired}
            />
          </View>

          {isQuestionEnabled && (
            <View className="mt-2">
              <View className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <TextInput
                  placeholder="Ví dụ: Tại sao bạn muốn tham gia nhóm?"
                  className="text-[15px] text-gray-900"
                  multiline
                  numberOfLines={3}
                  value={membershipQuestion}
                  onChangeText={setMembershipQuestion}
                  style={{ minHeight: 80, textAlignVertical: "top" }}
                />
              </View>
              <TouchableOpacity
                onPress={saveQuestion}
                className="mt-3 self-end bg-gray-900 px-5 py-2.5 rounded-xl shadow-sm"
              >
                <Text className="text-white text-[12px] font-bold uppercase tracking-wider">
                  Lưu câu hỏi
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Pending List */}
        {isApprovalRequired && (
          <View className="px-5 pt-8 pb-10">
            <Text className="text-[12px] font-black text-gray-400 uppercase tracking-[0.15em] mb-4">
              Yêu cầu chờ duyệt ({pendingUsers.length})
            </Text>

            {loading ? (
              <View className="py-20 items-center">
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text className="mt-4 text-gray-400 font-medium">Đang tải...</Text>
              </View>
            ) : pendingUsers.length === 0 ? (
              <View className="items-center py-20 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
                <IdentificationIcon size={48} color="#d1d5db" />
                <Text className="text-gray-400 text-[15px] mt-4 font-medium">
                  Hiện không có yêu cầu nào
                </Text>
              </View>
            ) : (
              <View className="space-y-4">
                {pendingUsers.map((user) => (
                  <View
                    key={user.id}
                    className="bg-white rounded-3xl border border-gray-100 p-4 shadow-sm"
                  >
                    <View className="flex-row items-center mb-4">
                      {user.avatar ? (
                        <Image
                          source={{ uri: user.avatar }}
                          className="w-14 h-14 rounded-full border-2 border-white shadow-sm"
                        />
                      ) : (
                        <View className="w-14 h-14 rounded-full bg-blue-50 items-center justify-center border-2 border-blue-100">
                          <Text className="text-blue-500 font-black text-xl">
                            {user.name?.charAt(0)?.toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View className="ml-4 flex-1">
                        <Text className="text-[17px] font-black text-gray-900" numberOfLines={1}>
                          {user.name}
                        </Text>
                        <Text className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                          Đang chờ phê duyệt
                        </Text>
                      </View>
                    </View>

                    {user.answer ? (
                      <View className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50 mb-4">
                        <View className="flex-row items-center mb-1.5">
                          <ChatBubbleBottomCenterTextIcon size={14} color="#3b82f6" />
                          <Text className="text-[11px] font-black text-blue-500 uppercase tracking-wider ml-1.5">
                            Câu trả lời
                          </Text>
                        </View>
                        <Text className="text-[14px] text-gray-700 italic leading-5">
                          "{user.answer}"
                        </Text>
                      </View>
                    ) : null}

                    <View className="flex-row space-x-3">
                      <TouchableOpacity
                        className="flex-1 bg-gray-50 h-12 rounded-2xl items-center justify-center mr-2"
                        onPress={() => handleReject(user.id)}
                      >
                        <Text className="text-[14px] font-bold text-gray-500">TỪ CHỐI</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        className="flex-1 bg-blue-600 h-12 rounded-2xl items-center justify-center shadow-lg shadow-blue-500/20"
                        onPress={() => handleApprove(user.id)}
                      >
                        <Text className="text-[14px] font-black text-white uppercase tracking-wider">CHẤP NHẬN</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
