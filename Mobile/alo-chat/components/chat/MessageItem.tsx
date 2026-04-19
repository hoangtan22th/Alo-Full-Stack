import React from "react";
import {
  Image,
  LayoutAnimation,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { InformationCircleIcon } from "react-native-heroicons/outline";
import { MessageDTO } from "../../services/messageService";
import { EMOJI_MAP } from "../../constants/Chat";

interface MessageItemProps {
  msg: MessageDTO;
  isSender: boolean;
  isLastInBlock: boolean;
  onLongPress: () => void;
  openReactionDetails: () => void;
  chatImages: MessageDTO[];
  setViewerIndex: (idx: number) => void;
  messageRefs: React.MutableRefObject<Record<string, View>>;
  expandedTimeMsgId: string | null;
  setExpandedTimeMsgId: React.Dispatch<React.SetStateAction<string | null>>;
}

export const MessageItem = ({
  msg,
  isSender,
  isLastInBlock,
  onLongPress,
  openReactionDetails,
  chatImages,
  setViewerIndex,
  messageRefs,
  expandedTimeMsgId,
  setExpandedTimeMsgId,
}: MessageItemProps) => {
  const timeString = new Date(msg.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <View
      className={`${isLastInBlock ? "" : "mb-1"} w-full ${isSender ? "items-end" : "items-start"}`}
    >
      <TouchableOpacity
        ref={(r) => {
          if (r) messageRefs.current[msg._id] = r as any;
        }}
        activeOpacity={0.8}
        onLongPress={onLongPress}
        onPress={() => {
          if (!isLastInBlock) {
            LayoutAnimation.configureNext(
              LayoutAnimation.Presets.easeInEaseOut,
            );
            setExpandedTimeMsgId((prev) => (prev === msg._id ? null : msg._id));
          }
        }}
        className="relative"
      >
        <View
          className={`shadow-sm ${
            msg.type === "image" && !msg.isRevoked
              ? "p-0 bg-transparent"
              : "px-5 py-3 " +
                (isSender
                  ? "bg-black rounded-3xl rounded-br-lg"
                  : "bg-white rounded-3xl rounded-bl-lg")
          }`}
        >
          {msg.isRevoked ? (
            <Text
              className={
                "italic text-sm leading-6 " +
                (isSender ? "text-gray-300" : "text-gray-400")
              }
            >
              Tin nhắn đã bị thu hồi
            </Text>
          ) : msg.type === "image" ? (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                const idx = chatImages.findIndex((img) => img._id === msg._id);
                if (idx !== -1) setViewerIndex(idx);
              }}
              onLongPress={onLongPress}
            >
              <Image
                source={{ uri: msg.content }}
                className="w-[260px] h-[200px] rounded-[22px] border border-gray-100/50 self-center"
                resizeMode="cover"
              />
            </TouchableOpacity>
          ) : msg.type === "file" ? (
            <View className="flex-row items-center gap-2">
              <View className="w-10 h-10 bg-gray-200/20 items-center justify-center rounded-lg">
                <InformationCircleIcon
                  size={24}
                  color={isSender ? "#fff" : "#000"}
                />
              </View>
              <View>
                <Text
                  className={`text-sm font-bold ${isSender ? "text-white" : "text-gray-900"}`}
                  numberOfLines={1}
                >
                  {msg.metadata?.fileName || "Tệp đính kèm"}
                </Text>
              </View>
            </View>
          ) : msg.type === "text" ? (
            <Text
              className={`text-base leading-6 ${isSender ? "text-white" : "text-gray-900"}`}
            >
              {msg.content}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>

      {/* Hiển thị phân loại đếm Emoji dính dưới đáy bong bóng thoại */}
      {(msg.reactions?.length ?? 0) > 0 && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={openReactionDetails}
          className={`bg-white border border-gray-100 rounded-[14px] px-1.5 py-0.5 flex-row flex-wrap items-center shadow-sm z-10 -mt-3.5 mb-2 max-w-[85%] ${isSender ? "mr-4" : "ml-4"}`}
        >
          <View className="flex-row flex-wrap items-center gap-1.5">
            {Array.from(
              new Set((msg.reactions || []).map((r: any) => r.emoji)),
            ).map((emojiKey: any) => {
              const count = (msg.reactions || [])
                .filter((r: any) => r.emoji === emojiKey)
                .reduce((acc: number, r: any) => acc + (r.count || 1), 0);
              return (
                <View
                  key={emojiKey}
                  className="flex-row items-center mt-0.5 mb-0.5"
                >
                  <Text className="text-[11px] mr-0.5">
                    {EMOJI_MAP[emojiKey] || "👍"}
                  </Text>
                  <Text className="text-[10px] font-bold text-gray-500">
                    {count}
                  </Text>
                </View>
              );
            })}
          </View>
        </TouchableOpacity>
      )}

      {(isLastInBlock || expandedTimeMsgId === msg._id) && (
        <View
          className={`flex-row items-center mt-1 ${isSender ? "justify-end pr-2" : "justify-start pl-2"}`}
        >
          <Text className="text-[11px] text-gray-500">{timeString}</Text>
          {isSender && (
            <Text
              className={`ml-1 text-[11px] font-bold ${msg.isRead ? "text-blue-500" : "text-gray-400"}`}
            >
              {msg.isRead ? "✓✓" : "✓"}
            </Text>
          )}
        </View>
      )}
    </View>
  );
};
