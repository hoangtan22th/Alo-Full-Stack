import React from "react";
import {
  Dimensions,
  Image,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ArrowUturnLeftIcon,
  ClipboardDocumentIcon,
  MapPinIcon,
  TrashIcon,
  XMarkIcon,
} from "react-native-heroicons/outline";
import { MessageDTO } from "../../services/messageService";
import { EMOJI_MAP } from "../../constants/Chat";

interface MessageContextMenuProps {
  visible: boolean;
  selectedMsg: MessageDTO | null;
  layout: { x: number; y: number; width: number; height: number } | null;
  onClose: () => void;
  onReact: (emojiKey: string) => void;
  onClearReactions: () => void;
  onCopy: () => void;
  onRevoke: () => void;
  onDeleteLocal: () => void;
  onPin: () => void;
  onUnpin: () => void;
  isPinned: boolean;
  currentUserId: string;
}

export const MessageContextMenu = ({
  visible,
  selectedMsg,
  layout,
  onClose,
  onReact,
  onClearReactions,
  onCopy,
  onRevoke,
  onDeleteLocal,
  onPin,
  onUnpin,
  isPinned,
  currentUserId,
}: MessageContextMenuProps) => {
  if (!visible || !selectedMsg || !layout) return null;

  const screenHeight = Dimensions.get("window").height;
  const isTopHalf = layout.y < screenHeight / 2;
  const isSender = selectedMsg.senderId === currentUserId;
  const hasMyReaction = selectedMsg.reactions?.some((r: any) => r.userId === currentUserId);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 bg-black/60" onPress={onClose}>
        <View className="flex-1">
          {/* Highlighted Message */}
          <View
            style={{
              position: "absolute",
              top: layout.y,
              left: layout.x,
              width: layout.width,
              height: layout.height,
            }}
          >
            <View
              className={`shadow-2xl ${
                selectedMsg.type === "image" && !selectedMsg.isRevoked
                  ? "p-0 bg-transparent"
                  : "px-5 py-3 " +
                    (isSender
                      ? "bg-black rounded-3xl rounded-br-lg"
                      : "bg-white rounded-3xl rounded-bl-lg")
              }`}
            >
              {selectedMsg.isRevoked ? (
                <Text className="italic text-sm text-gray-400">
                  Tin nhắn đã bị thu hồi
                </Text>
              ) : selectedMsg.type === "image" ? (
                <Image
                  source={{ uri: selectedMsg.content }}
                  className="w-[260px] h-[200px] rounded-[22px] border border-gray-100/50"
                  resizeMode="cover"
                />
              ) : (
                <Text
                  className={`text-base leading-6 ${
                    isSender ? "text-white" : "text-gray-900"
                  }`}
                >
                  {selectedMsg.content}
                </Text>
              )}
            </View>
          </View>

          {/* Emoji & Menu */}
          <View
            style={{
              position: "absolute",
              left: 20,
              right: 20,
              top: isTopHalf
                ? layout.y + layout.height + 15
                : Math.max(
                    20,
                    layout.y -
                      (isSender
                        ? selectedMsg.type === "image"
                          ? 200
                          : 230
                        : selectedMsg.type === "image"
                          ? 150
                          : 190),
                  ),
              alignItems: isSender ? "flex-end" : "flex-start",
            }}
          >
            {/* Emoji Tray */}
            <View
              //@ts-ignore - onStartShouldSetResponder is valid in RN but TS might complain
              onStartShouldSetResponder={() => true}
              className="bg-white rounded-full p-2 flex-row gap-2 items-center shadow-2xl border border-gray-100 mb-3"
            >
              {Object.entries(EMOJI_MAP).map(([key, emoji]) => (
                <TouchableOpacity
                  key={key}
                  onPress={() => onReact(key)}
                  className="w-10 h-10 bg-gray-50 rounded-full items-center justify-center active:scale-90"
                >
                  <Text className="text-xl">{emoji}</Text>
                </TouchableOpacity>
              ))}

              {hasMyReaction && (
                <TouchableOpacity
                  onPress={onClearReactions}
                  className="w-10 h-10 bg-red-50 rounded-full items-center justify-center border border-red-100 active:scale-90"
                >
                  <XMarkIcon size={20} color="#ef4444" />
                </TouchableOpacity>
              )}
            </View>

            {/* Context Menu */}
            <View
              //@ts-ignore
              onStartShouldSetResponder={() => true}
              className="bg-white rounded-2xl w-48 shadow-2xl border border-gray-100 overflow-hidden"
            >
              {!selectedMsg.isRevoked && selectedMsg.type === "text" && (
                <TouchableOpacity
                  onPress={onCopy}
                  className="flex-row items-center gap-3 px-4 py-3 border-b border-gray-50 active:bg-gray-50"
                >
                  <ClipboardDocumentIcon size={18} color="#4b5563" />
                  <Text className="text-[14px] font-medium text-gray-700">
                    Sao chép
                  </Text>
                </TouchableOpacity>
              )}

              {isPinned ? (
                <TouchableOpacity
                  onPress={onUnpin}
                  className="flex-row items-center gap-3 px-4 py-3 border-b border-gray-50 active:bg-gray-50"
                >
                  <MapPinIcon size={18} color="#f87171" />
                  <Text className="text-[14px] font-medium text-red-500">
                    Bỏ ghim
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={onPin}
                  className="flex-row items-center gap-3 px-4 py-3 border-b border-gray-50 active:bg-gray-50"
                >
                  <MapPinIcon size={18} color="#4b5563" />
                  <Text className="text-[14px] font-medium text-gray-700">
                    Ghim tin nhắn
                  </Text>
                </TouchableOpacity>
              )}

              {isSender && !selectedMsg.isRevoked && (
                <TouchableOpacity
                  onPress={onRevoke}
                  className="flex-row items-center gap-3 px-4 py-3 border-b border-gray-50 active:bg-gray-100"
                >
                  <ArrowUturnLeftIcon size={18} color="#f97316" />
                  <Text className="text-[14px] font-medium text-orange-500">
                    Thu hồi
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={onDeleteLocal}
                className="flex-row items-center gap-3 px-4 py-3 active:bg-red-50"
              >
                <TrashIcon size={18} color="#ef4444" />
                <Text className="text-[14px] font-medium text-red-500">
                  Xóa tin nhắn
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
};
