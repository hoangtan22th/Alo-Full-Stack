import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  XMarkIcon,
  MagnifyingGlassIcon,
  CheckIcon,
} from "react-native-heroicons/outline";
import { contactService } from "../../services/contactService";
import { useAuth } from "../../contexts/AuthContext";
import Checkbox from "expo-checkbox";

interface SendContactCardModalProps {
  visible: boolean;
  onClose: () => void;
  onSend: (selectedFriends: any[], includePhone: boolean) => Promise<void>;
}

export const SendContactCardModal = ({
  visible,
  onClose,
  onSend,
}: SendContactCardModalProps) => {
  const { user } = useAuth();
  const currentUserId = user?.id || user?._id || user?.userId;
  
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [includePhone, setIncludePhone] = useState(true);

  useEffect(() => {
    if (visible) {
      fetchFriends();
      setSelectedIds([]);
      setSearchQuery("");
      setIncludePhone(true);
    }
  }, [visible]);

  const fetchFriends = async () => {
    setLoading(true);
    try {
      const data = await contactService.getFriendsList();
      const friendsList = Array.isArray(data) ? data : [];
      setFriends(friendsList);
    } catch (error) {
      console.error("Không tải được danh sách bạn bè", error);
    } finally {
      setLoading(false);
    }
  };

  const getFriendDetails = (f: any) => {
    const isRequester = f.requesterId === currentUserId;
    const id = isRequester ? f.recipientId : f.requesterId;
    const name = isRequester ? f.recipientName : f.requesterName;
    const avatar = isRequester ? f.recipientAvatar : f.requesterAvatar;
    const phone = isRequester ? f.recipientPhone || f.phone : f.requesterPhone || f.phone;
    return { id, name, avatar, phone };
  };

  const filteredFriends = friends.filter((f) => {
    const { name } = getFriendDetails(f);
    return (name || "").toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleToggleSelect = (friendId: string) => {
    setSelectedIds((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleSend = async () => {
    if (selectedIds.length === 0) return;
    setSending(true);
    try {
      const selectedFriendsList = friends
        .map(getFriendDetails)
        .filter((f) => selectedIds.includes(f.id));

      await onSend(selectedFriendsList, includePhone);
      onClose();
    } catch (error) {
      console.error("Lỗi khi gửi danh thiếp:", error);
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-white h-[85%] rounded-t-3xl overflow-hidden">
            {/* Header */}
            <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100">
              <TouchableOpacity onPress={onClose} className="p-2 -ml-2">
                <Text className="text-blue-500 font-medium">Hủy</Text>
              </TouchableOpacity>
              <Text className="text-[17px] font-bold text-gray-900">Gửi danh thiếp</Text>
              <TouchableOpacity 
                onPress={handleSend} 
                disabled={selectedIds.length === 0 || sending}
                className="p-2 -mr-2"
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#3b82f6" />
                ) : (
                  <Text className={`font-bold ${selectedIds.length > 0 ? 'text-blue-500' : 'text-gray-300'}`}>Gửi</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View className="px-5 py-3 border-b border-gray-100 bg-white">
              <View className="flex-row items-center bg-gray-100 rounded-xl px-3 py-2.5">
                <MagnifyingGlassIcon size={20} color="#9ca3af" />
                <TextInput
                  placeholder="Tìm kiếm bạn bè..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  className="flex-1 ml-2 text-[15px] text-gray-900"
                  placeholderTextColor="#9ca3af"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery("")}>
                    <XMarkIcon size={18} color="#9ca3af" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* List */}
            <View className="flex-1">
              {loading ? (
                <View className="flex-1 items-center justify-center">
                  <ActivityIndicator size="large" color="#3b82f6" />
                  <Text className="text-gray-400 mt-2">Đang tải...</Text>
                </View>
              ) : filteredFriends.length === 0 ? (
                <View className="flex-1 items-center justify-center">
                  <Text className="text-gray-400">Không tìm thấy bạn bè</Text>
                </View>
              ) : (
                <FlatList
                  data={filteredFriends}
                  keyExtractor={(item) => getFriendDetails(item).id}
                  renderItem={({ item }) => {
                    const { id, name, avatar } = getFriendDetails(item);
                    const isSelected = selectedIds.includes(id);

                    return (
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => handleToggleSelect(id)}
                        className="flex-row items-center px-5 py-3 border-b border-gray-50"
                      >
                        <View
                          className={`w-5 h-5 rounded-full border mr-3 items-center justify-center ${
                            isSelected
                              ? "bg-blue-500 border-blue-500"
                              : "border-gray-300"
                          }`}
                        >
                          {isSelected && <CheckIcon size={14} color="white" strokeWidth={3} />}
                        </View>
                        
                        {avatar ? (
                          <Image
                            source={{ uri: avatar }}
                            className="w-12 h-12 rounded-full mr-3 border border-gray-100"
                          />
                        ) : (
                          <View className="w-12 h-12 rounded-full bg-blue-100 items-center justify-center mr-3 border border-gray-100">
                            <Text className="text-blue-600 font-bold text-[16px]">
                              {(name || "?").charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        )}
                        <Text className="text-[16px] font-bold text-gray-900 flex-1">
                          {name || "Người dùng"}
                        </Text>
                      </TouchableOpacity>
                    );
                  }}
                  contentContainerStyle={{ paddingBottom: 20 }}
                />
              )}
            </View>

            {/* Footer settings */}
            {selectedIds.length > 0 && (
              <View className="p-5 border-t border-gray-100 bg-white flex-row items-center">
                <Checkbox
                  value={includePhone}
                  onValueChange={setIncludePhone}
                  color={includePhone ? '#3b82f6' : undefined}
                  style={{ marginRight: 10, width: 20, height: 20 }}
                />
                <Text className="text-[15px] font-medium text-gray-700">
                  Gửi kèm số điện thoại
                </Text>
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
