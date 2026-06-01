import React from "react";
import { useRouter } from "expo-router";
import {
  Image,
  LayoutAnimation,
  Platform,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Animated,
} from "react-native";
import {
  InformationCircleIcon,
  EllipsisHorizontalIcon,
} from "react-native-heroicons/outline";
import { PlayIcon } from "react-native-heroicons/solid";
import { MessageDTO } from "../../services/messageService";
import { EMOJI_MAP } from "../../constants/Chat";
import { getMessageTextContent } from "../../utils/messageUtils";
import { openRemoteFile } from "../../utils/fileUtils";
import { WebView } from "react-native-webview";
import { PollMessagePreview } from "./PollMessagePreview";
import { useAuth } from "../../contexts/AuthContext";
import Pdf from "react-native-pdf";

interface MessageItemProps {
  msg: MessageDTO;
  isSender: boolean;
  isLastInBlock: boolean;
  onLongPress: (albumIndex?: number) => void;
  openReactionDetails: () => void;
  chatImages: MessageDTO[];
  setViewerIndex: (idx: number) => void;
  messageRefs: React.MutableRefObject<Record<string, View>>;
  expandedTimeMsgId: string | null;
  setExpandedTimeMsgId: React.Dispatch<React.SetStateAction<string | null>>;
  onReplyClick?: (messageId: string) => void;
  isHighlighted?: boolean;
  isAdminHighlighted?: boolean;
  onPress?: () => void;
  isSelected?: boolean;
  onOpenGallery?: (imagesList: any[], idx: number) => void;
  members?: any[];
  userCache?: Record<string, any>;
  currentUserId?: string | null;
}

import { GroupLinkBubble } from "./GroupLinkBubble";

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
  isAdminHighlighted,
  onPress,
  isSelected,
  onOpenGallery,
  members = [],
  userCache = {},
  currentUserId,
}: MessageItemProps) => {
  const router = useRouter();
  const timeString = new Date(msg.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const renderContentWithMentions = (rawContent: string) => {
    const content = getMessageTextContent(rawContent);
    if (!content) return content;
    const mentionNames = ["Tất cả"];
    members.forEach((m: any) => {
      const name = userCache[String(m.userId || m._id)]?.fullName || m.fullName || m.displayName || m.name;
      if (name) mentionNames.push(name);
    });
    
    if (mentionNames.length === 0) return content;
    
    const sortedNames = [...mentionNames].sort((a, b) => b.length - a.length);
    const regex = new RegExp(`@(${sortedNames.map(n => n.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')).join("|")})`, "g");
    
    const parts = content.split(regex);
    if (parts.length === 1) return content;
    
    const result: React.ReactNode[] = [];
    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 1) {
        result.push(
          <Text key={i} className={`font-bold ${isSender ? "text-blue-100" : "text-blue-700"}`}>
            @{parts[i]}
          </Text>
        );
      } else if (parts[i]) {
        result.push(parts[i]);
      }
    }
    return <>{result}</>;
  };

  const textContent = msg.type === "text" ? getMessageTextContent(msg.content) : "";
  const GROUP_LINK_REGEX = /(?:https?:\/\/)?alo\.chat\/g\/([a-f\d]{24})/i;
  const groupMatch = msg.type === "text" ? textContent?.match(GROUP_LINK_REGEX) : null;
  const isTextOnlyGroupLink = groupMatch ? textContent.trim() === groupMatch[0].trim() : false;

  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 20,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
    }).start();
  };

  return (
    <View
      className={`${isLastInBlock ? "" : "mb-1"}`}
      style={{
        width: "100%",
        alignItems:
          msg.type === "poll" ? "center" : isSender ? "flex-end" : "flex-start",
        justifyContent: "center",
        marginVertical: msg.type === "poll" ? 12 : 0,
        paddingHorizontal: 10,
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
        activeOpacity={0.9}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onLongPress={() => {
          onLongPress();
        }}
        onPress={() => {
          if (onPress) {
            onPress();
          } else if (!isLastInBlock) {
            LayoutAnimation.configureNext(
              LayoutAnimation.Presets.easeInEaseOut,
            );
            setExpandedTimeMsgId((prev) => (prev === msg._id ? null : msg._id));
          }
        }}
        className="relative"
      >
        <Animated.View
          className={`border-[1px] ${
            ((msg.type === "image" || msg.type === "file") && !msg.isRevoked) ||
            msg.type === "poll" || msg.type === "contact" || isTextOnlyGroupLink
              ? `p-0 bg-transparent ${msg.type === "image" ? "rounded-[22px] border-0" : "rounded-2xl border-0"}`
              : "px-5 py-3 " +
                (isSender
                  ? "bg-black rounded-3xl rounded-br-lg"
                  : "bg-white rounded-3xl rounded-bl-lg")
          } ${isAdminHighlighted ? "border-amber-200" : isSelected ? "border-blue-500" : isSender ? "border-transparent" : "border-gray-200"}`}
          style={[
            msg.type === "poll" ? { width: "100%", alignItems: "center" } : {},
            { transform: [{ scale: scaleAnim }] }
          ]}
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
                  ? getMessageTextContent(msg.replyTo.content)
                  : msg.replyTo.type === "image" ||
                      (msg.replyTo.type === "file" &&
                        [
                          "jpg",
                          "jpeg",
                          "png",
                          "gif",
                          "webp",
                          "heic",
                          "heif",
                        ].includes(
                          msg.replyTo.content.split(".").pop()?.toLowerCase() ||
                            "",
                        ))
                    ? msg.replyTo.content === "[Album Ảnh]"
                      ? "[Album Ảnh]"
                      : "[Hình ảnh]"
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
            msg.metadata?.isSticker ? (
              <TouchableWithoutFeedback onLongPress={() => onLongPress()}>
                <Image
                  source={{ uri: msg.content }}
                  className="w-[120px] h-[120px] self-center my-1"
                  resizeMode="contain"
                />
              </TouchableWithoutFeedback>
            ) : msg.metadata?.imageGroup ? (
              (() => {
                const visibleImages = (msg.metadata.imageGroup || [])
                  .map((img: any, idx: number) => ({
                    ...img,
                    originalIndex: idx,
                  }))
                  .filter(
                    (img: any) => !img.deletedByUsers?.includes(currentUserId),
                  );

                if (visibleImages.length === 0) return null;

                const count = visibleImages.length;
                let itemWidth: any = "100%";
                let itemHeight = 180;

                if (count === 2) {
                  itemWidth = "49%";
                  itemHeight = 120;
                } else if (count === 3) {
                  itemWidth = "32.3%";
                  itemHeight = 90;
                } else if (count >= 4) {
                  itemWidth = "49%";
                  itemHeight = 100;
                }

                return (
                  <View className="flex-row flex-wrap gap-1 justify-start w-[260px] p-1 bg-gray-50 rounded-2xl relative">
                    {visibleImages.map((img: any, idx: number) => {
                      const shouldShowPlaceholder =
                        msg.isRevoked || img.isRevoked;
                      return (
                        <TouchableOpacity
                          key={idx}
                          style={{ width: itemWidth, height: itemHeight }}
                          className="rounded-lg overflow-hidden bg-gray-200 relative justify-center items-center"
                          activeOpacity={0.9}
                          onPress={() => {
                            if (onPress) {
                              onPress();
                            } else if (!shouldShowPlaceholder) {
                              const albumPhotos = visibleImages.map(
                                (p: any) => ({
                                  _id: `${msg._id}_img_${p.originalIndex}`,
                                  content: p.url,
                                  type: "image",
                                  createdAt: msg.createdAt,
                                  senderId: msg.senderId,
                                  parentMessageId: msg._id,
                                  albumIndex: p.originalIndex,
                                  isRevoked: p.isRevoked,
                                }),
                              );
                              if (onOpenGallery) {
                                onOpenGallery(albumPhotos, idx);
                              } else {
                                const indexInChatImages = chatImages.findIndex(
                                  (img) => img._id === msg._id,
                                );
                                if (indexInChatImages !== -1)
                                  setViewerIndex(indexInChatImages);
                              }
                            }
                          }}
                          onLongPress={() => onLongPress(img.originalIndex)}
                        >
                          {shouldShowPlaceholder ? (
                            <View className="items-center justify-center">
                              <Text className="text-[10px] text-gray-400 italic">
                                Đã thu hồi
                              </Text>
                            </View>
                          ) : (
                            <Image
                              source={{ uri: img.url }}
                              className="w-full h-full"
                              resizeMode="cover"
                            />
                          )}
                        </TouchableOpacity>
                      );
                    })}

                    {!msg.isRevoked && (
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => onLongPress()}
                        style={{
                          position: "absolute",
                          bottom: 8,
                          right: 8,
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: "rgba(0,0,0,0.6)",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <EllipsisHorizontalIcon size={20} color="white" />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })()
            ) : (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => {
                  if (onPress) {
                    onPress();
                  } else {
                    if (onOpenGallery) {
                      const idx = chatImages.findIndex(
                        (img) => img._id === msg._id,
                      );
                      if (idx !== -1) {
                        onOpenGallery(chatImages, idx);
                      } else {
                        onOpenGallery([msg], 0);
                      }
                    } else {
                      const idx = chatImages.findIndex(
                        (img) => img._id === msg._id,
                      );
                      if (idx !== -1) setViewerIndex(idx);
                    }
                  }
                }}
                onLongPress={() => onLongPress()}
              >
                <Image
                  source={{ uri: msg.content }}
                  className="w-[260px] h-[200px] rounded-[22px] border border-gray-100/50 self-center"
                  resizeMode="cover"
                />
              </TouchableOpacity>
            )
          ) : msg.type === "file" ? (
            (() => {
              const fileName =
                msg.metadata?.fileName || msg.content.split("/").pop() || "";
              const ext = fileName.split(".").pop()?.toLowerCase();
              const isVideo = [
                "mp4",
                "mov",
                "m4v",
                "avi",
                "3gp",
                "mkv",
              ].includes(ext || "");

              if (isVideo) {
                return (
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => {
                      if (onPress) {
                        onPress();
                      } else {
                        openRemoteFile(msg.content, fileName);
                      }
                    }}
                    onLongPress={() => onLongPress()}
                    className="w-[260px] h-[160px] bg-black rounded-2xl justify-center items-center relative overflow-hidden"
                  >
                    <View className="absolute inset-0 bg-black/40 justify-center items-center z-10">
                      <View className="w-14 h-14 bg-white/30 rounded-full justify-center items-center border border-white/50">
                        <PlayIcon size={30} color="white" />
                      </View>
                    </View>
                    <Text
                      className="absolute bottom-2 left-2 right-2 text-white text-[10px] font-bold z-20"
                      numberOfLines={1}
                    >
                      {fileName}
                    </Text>
                  </TouchableOpacity>
                );
              }

              return (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    if (onPress) {
                      onPress();
                    } else {
                      openRemoteFile(
                        msg.content,
                        msg.metadata?.fileName || `file_${msg._id}`,
                      );
                    }
                  }}
                  onLongPress={() => {
                    onLongPress();
                  }}
                  className={`overflow-hidden rounded-2xl bg-white border-gray-200 border`}
                  style={{ width: 260 }}
                >
                  {/* Top Section: Preview */}
                  <View className="h-36 bg-gray-100/50 justify-center overflow-hidden border-b border-gray-100">
                    {(() => {
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
                      const isOffice = [
                        "doc",
                        "docx",
                        "xls",
                        "xlsx",
                        "ppt",
                        "pptx",
                      ].includes(ext || "");

                      if (isText) {
                        return <FileTextPreview url={msg.content} />;
                      } else if (isPdf) {
                        return <FilePdfPreview url={msg.content} />;
                      } else if (isOffice) {
                        return <OfficeFilePreview url={msg.content} />;
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
                          if (ext === "pdf") return "#ef4444";
                          if (["doc", "docx"].includes(ext || ""))
                            return "#3b82f6";
                          if (["xls", "xlsx"].includes(ext || ""))
                            return "#22c55e";
                          if (["ppt", "pptx"].includes(ext || ""))
                            return "#f97316";
                          if (["zip", "rar", "tar", "7z"].includes(ext || ""))
                            return "#7c3aed";
                          return "#6b7280";
                        })(),
                      }}
                    >
                      <Text className="text-white text-[10px] font-black uppercase">
                        {ext || "FILE"}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text
                        className="text-[15px] font-medium text-gray-900"
                        numberOfLines={1}
                      >
                        {fileName || "Tệp đính kèm"}
                      </Text>
                      <Text className="text-[12px] text-gray-500 mt-0.5 uppercase">
                        {ext || "FILE"}
                        {" • "}
                        {msg.metadata?.fileSize
                          ? msg.metadata.fileSize < 1024 * 1024
                            ? (msg.metadata.fileSize / 1024).toFixed(0) + " KB"
                            : (msg.metadata.fileSize / (1024 * 1024)).toFixed(
                                1,
                              ) + " MB"
                          : "0 KB"}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })()
          ) : msg.type === "text" ? (
            (() => {
              if (groupMatch) {
                const linkGroupId = groupMatch[1];
                
                return (
                  <View className="flex-col">
                    {!isTextOnlyGroupLink && (
                      <Text
                        className={`text-base leading-6 ${isSender ? "text-white" : "text-gray-900"}`}
                      >
                        {renderContentWithMentions(msg.content)}
                      </Text>
                    )}
                    <GroupLinkBubble msg={msg} linkGroupId={linkGroupId} isTextOnly={isTextOnlyGroupLink} onLongPress={() => onLongPress()} />
                  </View>
                );
              }

              return (
                <Text
                  className={`text-base leading-6 ${isSender ? "text-white" : "text-gray-900"}`}
                >
                  {renderContentWithMentions(msg.content)}
                </Text>
              );
            })()
          ) : msg.type === "poll" ? (
            <PollMessagePreview
              pollId={msg.metadata?.pollId || ""}
              isSender={isSender}
            />
          ) : msg.type === "contact" ? (
            <View className="w-[260px] bg-white rounded-2xl p-4 border-gray-200 border" style={{ alignSelf: "center" }}>
              <View className="flex-row items-center mb-2.5">
                <View className="bg-blue-50 px-2 py-0.5 rounded-md">
                  <Text className="text-[10px] text-blue-600 font-black uppercase tracking-wider">Danh thiếp</Text>
                </View>
              </View>
              <TouchableOpacity
                activeOpacity={0.7}
                onLongPress={() => onLongPress()}
                onPress={() => {
                  if (msg.metadata?.contactId) {
                    router.push({
                      pathname: "/contacts/send-request",
                      params: {
                        userId: msg.metadata.contactId,
                        fullName: msg.metadata.contactName,
                        phone: msg.metadata.contactPhone || "",
                        avatarUrl: msg.metadata.contactAvatar || "",
                        from: "chat",
                        chatId: msg.conversationId,
                      },
                    });
                  }
                }}
                className="flex-row items-center mb-4"
              >
                {msg.metadata?.contactAvatar ? (
                  <Image source={{ uri: msg.metadata.contactAvatar }} className="w-12 h-12 rounded-full mr-3" />
                ) : (
                  <View className="w-12 h-12 rounded-full bg-blue-100 items-center justify-center mr-3">
                    <Text className="text-blue-600 font-bold text-[16px]">{(msg.metadata?.contactName || "?").charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <View className="flex-1">
                  <Text className="text-[14px] font-black text-gray-900" numberOfLines={1}>{msg.metadata?.contactName}</Text>
                  <Text className="text-[11px] text-gray-500 font-medium mt-0.5" numberOfLines={1}>
                    {msg.metadata?.contactPhone ? `SĐT: ${msg.metadata.contactPhone}` : "Số điện thoại bảo mật"}
                  </Text>
                </View>
              </TouchableOpacity>
              <View className="h-[1px] bg-gray-100 mb-3" />
              <TouchableOpacity
                onLongPress={() => onLongPress()}
                onPress={() => {
                  if (msg.metadata?.contactId) {
                    router.push({
                      pathname: "/chat/[id]",
                      params: {
                        id: msg.metadata.contactId,
                        name: msg.metadata.contactName,
                        avatar: msg.metadata.contactAvatar || "",
                      },
                    });
                  }
                }}
                className="w-full py-2 bg-blue-50 rounded-xl items-center justify-center flex-row"
              >
                <Text className="text-blue-600 font-black text-[13px]">Nhắn tin</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </Animated.View>
      </TouchableOpacity>

      {/* Hiển thị phân loại đếm Emoji dính dưới đáy bong bóng thoại */}
      {!msg.isRevoked && (msg.reactions?.length ?? 0) > 0 && (
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

export const FileTextPreview = ({ url }: { url: string }) => {
  const [content, setContent] = React.useState<string>("Đang tải nội dung...");
  const [wrap, setWrap] = React.useState<boolean>(false);

  React.useEffect(() => {
    let isMounted = true;
    fetch(url)
      .then((res) => res.text())
      .then((text) => {
        if (isMounted)
          setContent(text.slice(0, 1000).trim() || "Tệp tin trống");
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
    <View
      className="flex-1 p-3 bg-gray-50/80 relative"
      style={{ minHeight: 140 }}
    >
      <TouchableOpacity
        onPress={() => setWrap(!wrap)}
        className="absolute top-2 right-2 px-2 py-1 bg-gray-200/80 rounded-md z-10"
      >
        <Text className="text-[9px] font-bold text-gray-600">
          {wrap ? "Không ngắt dòng" : "Ngắt dòng"}
        </Text>
      </TouchableOpacity>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={true}>
        <Text
          className="text-[10px] text-gray-500 leading-4"
          style={{
            fontFamily: Platform.select({
              ios: "Courier",
              android: "monospace",
            }),
          }}
          numberOfLines={wrap ? undefined : 7}
        >
          {content}
        </Text>
      </ScrollView>
    </View>
  );
};

export const FilePdfPreview = ({ url }: { url: string }) => {
  return (
    <View className="flex-1 overflow-hidden bg-white" pointerEvents="none">
      <Pdf
        source={{ uri: url, cache: true }}
        singlePage={true} // Rất quan trọng: Chỉ render trang 1 làm thumbnail để tối ưu RAM cho FlatList
        fitPolicy={0} // Fit theo chiều rộng
        style={{
          flex: 1,
          backgroundColor: "white",
          width: "100%",
          height: "100%",
          marginTop: -2,
        }}
        onError={(error) => {
          console.warn("[FilePdfPreview] Lỗi render PDF:", error);
        }}
      />
    </View>
  );
};

// const FilePdfPreview = ({ url }: { url: string }) => {
//   // iOS đọc trực tiếp URL, Android dùng Google Docs
//   const previewUrl =
//     Platform.OS === "android"
//       ? `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`
//       : url;

//   return (
//     <View className="flex-1 overflow-hidden bg-white">
//       <WebView
//         source={{ uri: previewUrl }}
//         scrollEnabled={false}
//         pointerEvents="none"
//         javaScriptEnabled={true} // Cần thiết cho Google Docs trên Android
//         domStorageEnabled={true} // Cần thiết cho Google Docs trên Android
//         startInLoadingState={true}
//         style={{ flex: 1, backgroundColor: "white" }}
//         onHttpError={(syntheticEvent) => {
//           const { nativeEvent } = syntheticEvent;
//           console.warn("WebView HTTP error: ", nativeEvent);
//         }}
//       />
//     </View>
//   );
// };

export const OfficeFilePreview = ({ url }: { url: string }) => {
  const previewUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;

  return (
    <View className="flex-1 overflow-hidden bg-white" pointerEvents="none">
      <WebView
        source={{ uri: previewUrl }}
        scrollEnabled={false}
        pointerEvents="none"
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        style={{
          flex: 1,
          backgroundColor: "white",
        }}
        onHttpError={(syntheticEvent) => {
          console.warn(
            "[OfficeFilePreview] HTTP error: ",
            syntheticEvent.nativeEvent,
          );
        }}
      />
    </View>
  );
};
