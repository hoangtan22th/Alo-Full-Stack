import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
} from "react-native";
import { XMarkIcon, CheckIcon } from "react-native-heroicons/outline";

interface CallMemberSelectorModalProps {
  visible: boolean;
  isVideo: boolean;
  members: any[];
  currentUserId: string;
  onClose: () => void;
  onStartCall: (selectedIds: string[]) => void;
}

export function CallMemberSelectorModal({
  visible,
  isVideo,
  members,
  currentUserId,
  onClose,
  onStartCall,
}: CallMemberSelectorModalProps) {
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  // Filter out the current user
  const otherMembers = members.filter(
    (m) => String(m.userId) !== String(currentUserId)
  );

  const toggleMember = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleStart = () => {
    onStartCall(selectedIds);
    setSelectedIds([]); // Reset for next time
  };

  const handleClose = () => {
    setSelectedIds([]);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-white rounded-t-3xl max-h-[80%] min-h-[50%]">
          {/* Header */}
          <View className="flex-row items-center justify-between p-4 border-b border-gray-100">
            <Text className="text-lg font-bold text-gray-900">
              Chọn thành viên gọi {isVideo ? "video" : "thoại"}
            </Text>
            <TouchableOpacity
              onPress={handleClose}
              className="p-2 rounded-full bg-gray-100"
            >
              <XMarkIcon size={20} color="#374151" />
            </TouchableOpacity>
          </View>

          {/* Member List */}
          <FlatList
            data={otherMembers}
            keyExtractor={(item) => String(item.userId)}
            renderItem={({ item }) => {
              const isSelected = selectedIds.includes(String(item.userId));
              return (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => toggleMember(String(item.userId))}
                  className="flex-row items-center p-4 border-b border-gray-50"
                >
                  {/* Avatar */}
                  {item.avatar ? (
                    <Image
                      source={{ uri: item.avatar }}
                      className="w-12 h-12 rounded-full"
                    />
                  ) : (
                    <View className="w-12 h-12 rounded-full bg-blue-100 items-center justify-center">
                      <Text className="text-blue-600 font-bold text-lg">
                        {(item.fullName || item.displayName || item.name || "?")
                          .charAt(0)
                          .toUpperCase()}
                      </Text>
                    </View>
                  )}

                  {/* Info */}
                  <View className="flex-1 ml-3">
                    <Text className="text-base font-medium text-gray-900">
                      {item.fullName || item.displayName || item.name}
                    </Text>
                  </View>

                  {/* Checkbox */}
                  <View
                    className={`w-6 h-6 rounded-full border items-center justify-center ${
                      isSelected
                        ? "bg-black border-black"
                        : "border-gray-300"
                    }`}
                  >
                    {isSelected && <CheckIcon size={14} color="white" />}
                  </View>
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={{ paddingBottom: 100 }}
          />

          {/* Footer Action */}
          <View className="absolute bottom-5 left-0 right-0 p-4 bg-white border-t border-gray-100 pb-8">
            <TouchableOpacity
              onPress={handleStart}
              disabled={selectedIds.length === 0}
              className={`py-3.5 rounded-xl items-center ${
                selectedIds.length > 0 ? "bg-black" : "bg-gray-300"
              }`}
            >
              <Text className="text-white font-bold text-base">
                Bắt đầu gọi ({selectedIds.length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
