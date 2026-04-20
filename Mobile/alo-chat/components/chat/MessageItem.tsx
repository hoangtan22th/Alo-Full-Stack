import React from "react";
import {
  Image,
  LayoutAnimation,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { InformationCircleIcon } from "react-native-heroicons/outline";
import { MessageDTO } from "../../services/messageService";
import { EMOJI_MAP } from "../../constants/Chat";
import { openRemoteFile } from "../../utils/fileUtils";
import { WebView } from "react-native-webview";
import { PollMessagePreview } from "./PollMessagePreview";
// import Pdf from "react-native-pdf";

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
  onReplyClick?: (messageId: string) => void;
  isHighlighted?: boolean;
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
  onReplyClick,
  isHighlighted,
}: MessageItemProps) => {
  const timeString = new Date(msg.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <View
      className={`${isLastInBlock ? "" : "mb-1"}`}
      style={{
        width: "100%",
        alignItems: msg.type === "poll" ? "center" : (isSender ? "flex-end" : "flex-start"), 
        justifyContent: "center",
        marginVertical: msg.type === "poll" ? 12 : 0,
        paddingHorizontal: 10
      }}
    >
      {isHighlighted && (
        <View
          className="absolute top-0 bottom-0 left-[-20px] right-[-20px] bg-yellow-100/50 z-0"
          pointerEvents="none"
        />
      )}
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
            (((msg.type === "image" || msg.type === "file") && !msg.isRevoked) || (msg.type === "poll"))
              ? "p-0 bg-transparent"
              : "px-5 py-3 " +
                (isSender
                  ? "bg-black rounded-3xl rounded-br-lg"
                  : "bg-white rounded-3xl rounded-bl-lg")
          }`}
          style={msg.type === "poll" ? { width: "100%", alignItems: "center" } : {}}
        >
          {msg.replyTo && msg.replyTo.messageId && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onReplyClick?.(msg.replyTo!.messageId)}
              className={`mb-2 p-2 rounded-lg border-l-4 border-blue-400 ${
                isSender ? "bg-gray-800" : "bg-gray-100"
              }`}
            >
              <Text
                className={`text-[12px] font-bold mb-0.5 ${
                  isSender ? "text-blue-300" : "text-blue-600"
                }`}
              >
                {msg.replyTo.senderName || "Người dùng"}
              </Text>
              <Text
                className={`text-[12px] ${
                  isSender ? "text-gray-400" : "text-gray-500"
                }`}
                numberOfLines={1}
              >
                {msg.replyTo.type === "text"
                  ? msg.replyTo.content
                  : msg.replyTo.type === "image"
                    ? (msg.replyTo.content === "[Album Ảnh]" ? "[Album Ảnh]" : "[Hình ảnh]")
                    : "[Tệp tin]"}
              </Text>
            </TouchableOpacity>
          )}

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
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() =>
                openRemoteFile(
                  msg.content,
                  msg.metadata?.fileName || `file_${msg._id}`,
                )
              }
              className={`overflow-hidden rounded-2xl ${
                isSender ? "bg-white" : "bg-white"
              }`}
              style={{ width: 260 }}
            >
              {/* Top Section: Preview */}
              <View className="h-36 bg-gray-100/50 justify-center overflow-hidden border-b border-gray-100">
                {(() => {
                  const fileName =
                    msg.metadata?.fileName ||
                    msg.content.split("/").pop() ||
                    "";
                  const ext = fileName.split(".").pop()?.toLowerCase();
                  const isText = [
                    "txt",
                    "js",
                    "ts",
                    "json",
                    "html",
                    "css",
                    "py",
                    "java",
                    "cpp",
                    "md",
                    "sql",
                    "sh",
                  ].includes(ext || "");
                  const isPdf = ext === "pdf";

                  if (isText) {
                    return <FileTextPreview url={msg.content} />;
                  } else if (isPdf) {
                    return <FilePdfPreview url={msg.content} />;
                  } else {
                    return (
                      <View className="flex-1 items-center justify-center bg-gray-50">
                        <InformationCircleIcon size={64} color="#CBD5E1" />
                        <Text className="text-[10px] text-gray-400 mt-2 font-medium">
                          Bản xem trước không khả dụng
                        </Text>
                      </View>
                    );
                  }
                })()}
              </View>

              {/* Bottom Section: Info Bar */}
              <View className="flex-row items-center p-3 bg-sky-50">
                <View
                  className="w-12 h-12 items-center justify-center rounded-xl mr-3"
                  style={{
                    backgroundColor: (() => {
                      const ext = msg.metadata?.fileName
                        ?.split(".")
                        .pop()
                        ?.toLowerCase();
                      if (ext === "pdf") return "#ef4444";
                      if (["doc", "docx"].includes(ext || "")) return "#3b82f6";
                      if (["xls", "xlsx"].includes(ext || "")) return "#22c55e";
                      if (["ppt", "pptx"].includes(ext || "")) return "#f97316";
                      return "#6b7280";
                    })(),
                  }}
                >
                  <Text className="text-white text-[10px] font-black uppercase">
                    {msg.metadata?.fileName?.split(".").pop() || "FILE"}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text
                    className="text-[15px] font-medium text-gray-900"
                    numberOfLines={1}
                  >
                    {msg.metadata?.fileName || "Tệp đính kèm"}
                  </Text>
                  <Text className="text-[12px] text-gray-500 mt-0.5 uppercase">
                    {msg.metadata?.fileName?.split(".").pop() || "FILE"}
                    {" • "}
                    {msg.metadata?.fileSize
                      ? msg.metadata.fileSize < 1024 * 1024
                        ? (msg.metadata.fileSize / 1024).toFixed(0) + " KB"
                        : (msg.metadata.fileSize / (1024 * 1024)).toFixed(1) +
                          " MB"
                      : "0 KB"}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ) : msg.type === "text" ? (
            <Text
              className={`text-base leading-6 ${isSender ? "text-white" : "text-gray-900"}`}
            >
              {msg.content}
            </Text>
          ) : msg.type === "poll" ? (
            <PollMessagePreview pollId={msg.metadata?.pollId || ""} isSender={isSender} />
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

const FileTextPreview = ({ url }: { url: string }) => {
  const [content, setContent] = React.useState<string>("Đang tải nội dung...");

  React.useEffect(() => {
    let isMounted = true;
    fetch(url)
      .then((res) => res.text())
      .then((text) => {
        if (isMounted) setContent(text.slice(0, 500).trim() || "Tệp tin trống");
      })
      .catch((err) => {
        console.error("[FilePreview] Fetch error:", err);
        if (isMounted) setContent("Không thể tải nội dung xem trước");
      });
    return () => {
      isMounted = false;
    };
  }, [url]);

  return (
    <View className="flex-1 p-3 bg-gray-50/80" style={{ minHeight: 128 }}>
      <Text
        className="text-[10px] text-gray-500 leading-4"
        style={{
          fontFamily: Platform.select({ ios: "Courier", android: "monospace" }),
        }}
        numberOfLines={7}
      >
        {content}
      </Text>
    </View>
  );
};

// const FilePdfPreview = ({ url }: { url: string }) => {
//   return (
//     <View className="flex-1 overflow-hidden bg-white" pointerEvents="none">
//       <Pdf
//         source={{ uri: url, cache: true }}
//         singlePage={true} // Rất quan trọng: Chỉ render trang 1 làm thumbnail để tối ưu RAM cho FlatList
//         fitPolicy={0} // Fit theo chiều rộng
//         style={{
//           flex: 1,
//           backgroundColor: "white",
//           width: "100%",
//           height: "100%",
//         }}
//         onError={(error) => {
//           console.warn("[FilePdfPreview] Lỗi render PDF:", error);
//         }}
//       />
//     </View>
//   );
// };

const FilePdfPreview = ({ url }: { url: string }) => {
  // iOS đọc trực tiếp URL, Android dùng Google Docs
  const previewUrl =
    Platform.OS === "android"
      ? `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`
      : url;

  return (
    <View className="flex-1 overflow-hidden bg-white">
      <WebView
        source={{ uri: previewUrl }}
        scrollEnabled={false}
        pointerEvents="none"
        javaScriptEnabled={true} // Cần thiết cho Google Docs trên Android
        domStorageEnabled={true} // Cần thiết cho Google Docs trên Android
        startInLoadingState={true}
        style={{ flex: 1, backgroundColor: "white" }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.warn("WebView HTTP error: ", nativeEvent);
        }}
      />
    </View>
  );
};
