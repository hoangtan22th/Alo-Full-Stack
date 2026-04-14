import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  Pressable,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Bars3Icon,
  PlusIcon,
  MagnifyingGlassIcon,
  EllipsisHorizontalIcon,
  QrCodeIcon,
  XMarkIcon,
  UserGroupIcon,
  MapPinIcon,
  TagIcon,
  ChevronRightIcon,
} from "react-native-heroicons/outline";
import { useRouter } from "expo-router";
import { groupService } from "../../services/groupService";
import { useSocket } from "../../contexts/SocketContext";
import { useAuth } from "../../contexts/AuthContext";
import { userService } from "../../services/userService";

const { height: screenHeight, width: screenWidth } = Dimensions.get("window");

// --- Sub-component: LabelSelectorModal --- (Remains largely the same)
function LabelSelectorModal({
  isOpen,
  onClose,
  labels,
  onSelect,
  currentLabelId,
}: {
  isOpen: boolean;
  onClose: () => void;
  labels: any[];
  onSelect: (labelId: string | null) => void;
  currentLabelId?: string;
}) {
  if (!isOpen) return null;

  return (
    <Modal visible={isOpen} transparent={true} animationType="slide">
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 bg-black/40" />
      </TouchableWithoutFeedback>
      <View className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 min-h-[300px] shadow-xl">
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-xl font-bold text-gray-900">Chọn nhãn phân loại</Text>
          <TouchableOpacity onPress={onClose}>
            <XMarkIcon size={24} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            onPress={() => onSelect(null)}
            className="flex-row items-center py-4 border-b border-gray-50"
          >
            <View className="w-5 h-5 rounded-full border border-gray-300 mr-4 items-center justify-center">
               {!currentLabelId && <View className="w-2.5 h-2.5 bg-black rounded-full" />}
            </View>
            <Text className="text-lg text-red-500 font-bold">Không có nhãn (Gỡ nhãn)</Text>
          </TouchableOpacity>

          {labels.map((label) => (
            <TouchableOpacity
              key={label._id || label.id}
              onPress={() => onSelect(label._id || label.id)}
              className="flex-row items-center py-4 border-b border-gray-50"
            >
              <View 
                className="w-5 h-5 rounded-full mr-4 items-center justify-center shadow-sm"
                style={{ backgroundColor: label.color }}
              >
                {(currentLabelId === (label._id || label.id)) && (
                  <View className="w-2 h-2 bg-white rounded-full" />
                )}
              </View>
              <Text className="text-lg font-semibold text-gray-800">{label.name}</Text>
            </TouchableOpacity>
          ))}
          
          {labels.length === 0 && (
            <View className="items-center py-10">
               <Text className="text-gray-400 italic">Chưa có nhãn nào. Vui lòng tạo trên bản Web.</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const currentUserId = user?.id || user?._id || user?.userId || null;

  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Labels & Pin states
  const [labels, setLabels] = useState<any[]>([]);
  const [labelAssignments, setLabelAssignments] = useState<Record<string, any>>({});
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [showLabelModal, setShowLabelModal] = useState(false);

  // Custom Menu States
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [selectedChatLayout, setSelectedChatLayout] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const itemRefs = useRef<Record<string, View>>({});

  useEffect(() => {
    fetchData();
  }, [currentUserId]);

  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handlePinUpdated = (data: { conversationId: string; isPinned: boolean }) => {
      console.log("📍 [Mobile Socket] Received CONVERSATION_PIN_UPDATED:", data);
      setPinnedIds(prev => {
        const next = new Set(prev);
        if (data.isPinned) next.add(data.conversationId);
        else next.delete(data.conversationId);
        return next;
      });
    };

    const handleLabelUpdated = (data: { conversationId: string; label: any }) => {
      console.log("🏷️ [Mobile Socket] Received CONVERSATION_LABEL_UPDATED:", data);
      setLabelAssignments(prev => {
        const next = { ...prev };
        if (data.label) next[data.conversationId] = data.label;
        else delete next[data.conversationId];
        return next;
      });
    };

    const handleNewConversation = async (newConvo: any) => {
      console.log("🆕 [Mobile Socket] Received CONVERSATION_CREATED:", newConvo);
      
      // Tránh duplicate
      setConversations(prev => {
        const exists = prev.some(c => c.id === newConvo._id);
        if (exists) return prev;
        
        // Tạo object tạm thời theo format của list
        // Lưu ý: Tên và Avatar cho chat 1-1 có thể chưa chuẩn do cần gọi user-service
        // Nhưng tạm thời lấy dữ liệu thô từ newConvo
        const formatted = {
          id: newConvo._id,
          name: newConvo.name || "Cuộc trò chuyện mới",
          avatar: newConvo.groupAvatar,
          isGroup: newConvo.isGroup,
          membersCount: newConvo.members?.length,
          message: "Mới tạo",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          unread: true,
          updatedAt: newConvo.updatedAt || new Date().toISOString(),
        };

        return [formatted, ...prev];
      });

      // Gọi fetchGroups lại để đảm bảo dữ liệu (như tên người chat 1-1) được load đầy đủ từ user-service
      fetchGroups(); 
    };

    const handleConversationRemoved = (data: { conversationId: string }) => {
      console.log("🗑️ [Mobile Socket] Received CONVERSATION_REMOVED:", data);
      setConversations(prev => prev.filter(c => c.id !== data.conversationId));
    };

    socket.on("CONVERSATION_PIN_UPDATED", handlePinUpdated);
    socket.on("CONVERSATION_LABEL_UPDATED", handleLabelUpdated);
    socket.on("CONVERSATION_CREATED", handleNewConversation);
    socket.on("CONVERSATION_REMOVED", handleConversationRemoved);

    return () => {
      socket.off("CONVERSATION_PIN_UPDATED", handlePinUpdated);
      socket.off("CONVERSATION_LABEL_UPDATED", handleLabelUpdated);
      socket.off("CONVERSATION_CREATED", handleNewConversation);
      socket.off("CONVERSATION_REMOVED", handleConversationRemoved);
    };
  }, [socket]);

  const fetchData = async () => {
    if (!currentUserId) return;
    try {
      setLoading(true);
      await Promise.all([fetchGroups(), fetchLabelsInfo(), fetchPinnedInfo()]);
    } catch (err) {
      console.error("Lỗi tải dữ liệu mobile:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPinnedInfo = async () => {
    try {
      const res = await groupService.getPinnedConversations();
      const ids = res?.data || res || [];
      setPinnedIds(new Set(ids));
    } catch (err) {
      console.error("Lỗi tải danh sách ghim:", err);
    }
  };

  const fetchLabelsInfo = async () => {
    try {
      const [labelsRes, assignmentsRes]: any = await Promise.all([
        groupService.getLabels(),
        groupService.getConversationLabels(),
      ]);

      const labelsData = labelsRes?.data || labelsRes || [];
      const assignmentsData = assignmentsRes?.data || assignmentsRes || [];

      setLabels(labelsData);

      const assignmentMap: Record<string, any> = {};
      assignmentsData.forEach((as: any) => {
        if (as.conversationId && as.labelId) {
          assignmentMap[as.conversationId] = as.labelId;
        }
      });
      setLabelAssignments(assignmentMap);
    } catch (err) {
      console.error("Lỗi tải thông tin nhãn mobile:", err);
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await groupService.getMyGroups("all");
      let groups = response;
      if (response?.data?.data) {
        groups = response.data.data;
      } else if (response?.data) {
        groups = response.data;
      }

      if (Array.isArray(groups)) {
        const formattedGroups = await Promise.all(
          groups.map(async (g: any) => {
            const date = new Date(g.updatedAt);
            const timeString = date.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });

            let chatName = g.name;
            let chatAvatar = g.groupAvatar;

            if (!g.isGroup && currentUserId && g.members) {
              const otherMember = g.members.find(
                (m: any) => m.userId !== currentUserId,
              );
              if (otherMember) {
                try {
                  const userRes = await userService.getUserById(otherMember.userId);
                  const otherUser = userRes && (userRes as any).data ? (userRes as any).data : userRes;
                  if (otherUser) {
                    chatName = otherUser.fullName || otherUser.username || otherUser.name || "Người dùng";
                    chatAvatar = otherUser.avatar || chatAvatar;
                  }
                } catch (err) {
                  // Ignore
                }
              }
            }

            return {
              id: g._id,
              targetUserId: !g.isGroup && currentUserId && g.members
                ? g.members.find((m: any) => m.userId !== currentUserId)?.userId
                : undefined,
              name: chatName || "Cuộc trò chuyện",
              avatar: chatAvatar,
              isGroup: g.isGroup,
              membersCount: g.members?.length,
              message: "Chưa có tin nhắn",
              time: timeString,
              unread: false,
              updatedAt: g.updatedAt,
            };
          }),
        );
        setConversations(formattedGroups);
      }
    } catch (error) {
      console.error("Lỗi lấy danh sách nhóm:", error);
    }
  };

  const handleTogglePin = async () => {
    if (!selectedChat) return;
    const conversationId = selectedChat.id;
    closeMenu();
    try {
      await groupService.togglePinConversation(conversationId);
      const newPinned = new Set(pinnedIds);
      if (newPinned.has(conversationId)) {
        newPinned.delete(conversationId);
      } else {
        newPinned.add(conversationId);
      }
      setPinnedIds(newPinned);
    } catch (err) {
      console.error("Lỗi ghim:", err);
    }
  };

  const onLongPressItem = (chat: any) => {
    const ref = itemRefs.current[chat.id];
    if (ref) {
      ref.measureInWindow((x, y, width, height) => {
        setSelectedChatLayout({ x, y, width, height });
        setSelectedChat(chat);
      });
    }
  };

  const closeMenu = () => {
    setSelectedChat(null);
    setSelectedChatLayout(null);
  };

  const handleAssignLabel = async (labelId: string | null) => {
    if (!selectedChat) return;
    const convoId = selectedChat.id;
    closeMenu();
    try {
      await groupService.assignLabel(convoId, labelId);
      
      const newAssignments = { ...labelAssignments };
      if (!labelId) {
        delete newAssignments[convoId];
      } else {
        const selectedLabel = labels.find(l => (l._id || l.id) === labelId);
        newAssignments[convoId] = selectedLabel;
      }
      setLabelAssignments(newAssignments);
      setShowLabelModal(false);
    } catch (err) {
      console.error("Lỗi gán nhãn:", err);
    }
  };

  // Sorting logic for Pinning
  const sortedConversations = [...conversations].sort((a, b) => {
    const aPinned = pinnedIds.has(a.id);
    const bPinned = pinnedIds.has(b.id);
    
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const filteredConversations = sortedConversations.filter((chat) =>
    chat.name?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Helper renderer for Chat Item to reuse in list and modal
  const renderChatItemContent = (chat: any, isHighlighted: boolean = false) => {
    return (
      <View 
        className={`flex-row items-center p-3 rounded-2xl ${
          isHighlighted ? "bg-white" : pinnedIds.has(chat.id) ? "bg-blue-50/50" : ""
        }`}
      >
        <View className="relative">
          {chat.avatar ? (
            <Image source={{ uri: chat.avatar }} className="w-14 h-14 rounded-full" />
          ) : (
            <View className="w-14 h-14 rounded-full bg-gray-200 items-center justify-center">
              {chat.isGroup ? <UserGroupIcon size={24} color="#6b7280" /> : <Text className="text-gray-500 font-bold text-lg">{chat.name?.charAt(0)}</Text>}
            </View>
          )}
          {chat.unread && <View className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-black border-2 border-white rounded-full" />}
        </View>

        <View className="flex-1 ml-4 justify-center">
          <View className="flex-row justify-between items-center mb-1">
            <View className="flex-row items-center gap-1 flex-1 overflow-hidden">
              {pinnedIds.has(chat.id) && <MapPinIcon size={14} color="#3b82f6" fill="#3b82f6" />}
              <Text className={`text-base text-gray-900 ${chat.unread ? "font-bold" : "font-semibold"} flex-shrink-1 mr-1`} numberOfLines={1}>
                {chat.name}
              </Text>
              {labelAssignments[chat.id] && (
                <View 
                  className="px-1.5 py-0.5 rounded-full shadow-sm"
                  style={{ backgroundColor: labelAssignments[chat.id].color }}
                >
                  <Text className="text-[10px] font-black text-white uppercase">{labelAssignments[chat.id].name.substring(0,6)}</Text>
                </View>
              )}
            </View>
            <Text className={`text-xs ${chat.unread ? "text-black font-bold uppercase" : "text-gray-500 uppercase"}`}>
              {chat.time}
            </Text>
          </View>
          <Text className={`text-sm ${chat.unread ? "text-black" : "text-gray-500"}`} numberOfLines={1}>
            {chat.message}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View
      style={{ flex: 1, backgroundColor: "white", paddingTop: insets.top + 10 }}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 mb-6 z-50">
        <View className="flex-row items-center">
          <TouchableOpacity>
            <Bars3Icon size={28} color="#000" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold ml-4">Messages</Text>
        </View>
        <View className="flex-row items-center gap-4">
          <TouchableOpacity onPress={() => router.push("/scan-qr" as any)}>
            <QrCodeIcon size={28} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowPlusMenu(true)}>
            <PlusIcon size={28} color="#000" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Plus Menu Modal */}
      <Modal visible={showPlusMenu} transparent={true} animationType="fade">
        <TouchableWithoutFeedback onPress={() => setShowPlusMenu(false)}>
          <View className="flex-1 bg-black/20" />
        </TouchableWithoutFeedback>
        <View className="absolute top-24 right-4 bg-white rounded-lg shadow-lg py-2 min-w-[220px] elevation-5">
          <TouchableOpacity className="px-4 py-3 border-b border-gray-100" onPress={() => { setShowPlusMenu(false); router.push("/(tabs)/contacts/add-friend" as any); }}>
            <Text className="text-base text-gray-800">Thêm bạn</Text>
          </TouchableOpacity>
          <TouchableOpacity className="px-4 py-3 border-b border-gray-100" onPress={() => { setShowPlusMenu(false); router.push("/(tabs)/contacts" as any); }}>
            <Text className="text-base text-gray-800">Tạo đoạn chat mới</Text>
          </TouchableOpacity>
          <TouchableOpacity className="px-4 py-3 border-b border-gray-100" onPress={() => { setShowPlusMenu(false); router.push("/groups/create-group" as any); }}>
            <Text className="text-base text-gray-800">Tạo nhóm chat mới</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Search Bar */}
      <View className="px-4 mb-6">
        <View className="flex-row items-center bg-gray-100 rounded-full px-4">
          <MagnifyingGlassIcon size={20} color="#9ca3af" />
          <TextInput
            placeholder="Tìm kiếm đoạn chat..."
            className="flex-1 ml-2 text-gray-800 h-14 pt-1"
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")} className="pl-2 pr-1">
              <XMarkIcon size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View className="flex-1">
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#000" />
            <Text className="mt-4 text-gray-400">Đang tải tin nhắn...</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="px-4 pb-32">
              {filteredConversations.map((chat) => (
                <View 
                  key={chat.id}
                  ref={(r) => { if (r) itemRefs.current[chat.id] = r; }}
                  className="mb-3"
                >
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onLongPress={() => onLongPressItem(chat)}
                    onPress={() =>
                      router.push({
                        pathname: `/chat/${chat.id}` as any,
                        params: {
                          name: chat.name,
                          avatar: chat.avatar,
                          membersCount: chat.membersCount,
                          isGroup: chat.isGroup ? "true" : "false",
                          targetUserId: chat.targetUserId,
                        },
                      })
                    }
                  >
                    {renderChatItemContent(chat)}
                  </TouchableOpacity>
                </View>
              ))}
              
              {filteredConversations.length === 0 && (
                <View className="items-center py-20">
                   <Text className="text-gray-400">Không tìm thấy cuộc trò chuyện nào</Text>
                </View>
              )}
            </View>
          </ScrollView>
        )}
      </View>

      {/* --- CUSTOM CONTEXT MENU MODAL --- */}
      <Modal
        visible={!!selectedChat && !!selectedChatLayout}
        transparent
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <Pressable className="flex-1 bg-black/50" onPress={closeMenu}>
          {selectedChat && selectedChatLayout && (() => {
            const isTopHalf = selectedChatLayout.y < screenHeight / 2;
            
            return (
              <View className="flex-1">
                {/* Highlighted Chat Item */}
                <View
                  style={{
                    position: "absolute",
                    top: selectedChatLayout.y,
                    left: selectedChatLayout.x,
                    width: selectedChatLayout.width,
                    height: selectedChatLayout.height,
                  }}
                >
                  {renderChatItemContent(selectedChat, true)}
                </View>

                {/* Context Menu Options */}
                <View
                  style={{
                    position: "absolute",
                    left: 20,
                    right: 20,
                    top: isTopHalf 
                      ? selectedChatLayout.y + selectedChatLayout.height + 10 
                      : Math.max(20, selectedChatLayout.y - 120),
                    alignItems: "center",
                  }}
                >
                  <View 
                    onStartShouldSetResponder={() => true}
                    className="bg-white rounded-3xl w-64 shadow-2xl border border-gray-100 overflow-hidden"
                  >
                    <TouchableOpacity 
                      onPress={handleTogglePin}
                      className="flex-row items-center justify-between px-5 py-4 border-b border-gray-50 active:bg-gray-50"
                    >
                      <View className="flex-row items-center gap-3">
                        <MapPinIcon 
                          size={20} 
                          color={pinnedIds.has(selectedChat.id) ? "#3b82f6" : "#4b5563"} 
                          fill={pinnedIds.has(selectedChat.id) ? "#3b82f6" : "none"}
                        />
                        <Text className={`text-[15px] font-bold ${pinnedIds.has(selectedChat.id) ? "text-blue-500" : "text-gray-700"}`}>
                          {pinnedIds.has(selectedChat.id) ? "Bỏ ghim hội thoại" : "Ghim hội thoại"}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      onPress={() => { 
                        // Ẩn menu trước khi hiện Modal phân loại để tránh xung đột Modal lồng nhau trên Android/iOS
                        setSelectedChatLayout(null);
                        setShowLabelModal(true); 
                      }}
                      className="flex-row items-center justify-between px-5 py-4 active:bg-gray-50"
                    >
                      <View className="flex-row items-center gap-3">
                        <TagIcon size={20} color="#4b5563" />
                        <Text className="text-[15px] font-bold text-gray-700">Phân loại</Text>
                      </View>
                      <ChevronRightIcon size={16} color="#9ca3af" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })()}
        </Pressable>
      </Modal>

      <LabelSelectorModal
        isOpen={showLabelModal}
        onClose={() => { setShowLabelModal(false); closeMenu(); }}
        labels={labels}
        onSelect={handleAssignLabel}
        currentLabelId={labelAssignments[selectedChat?.id || ""]?._id || labelAssignments[selectedChat?.id || ""]?.id}
      />
    </View>
  );
}
