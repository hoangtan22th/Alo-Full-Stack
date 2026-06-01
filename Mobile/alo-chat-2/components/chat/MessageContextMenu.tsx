import React from "react";
import {
  Dimensions,
  Image,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { BlurView } from "expo-blur";
import {
  ArrowUturnLeftIcon,
  ClipboardDocumentIcon,
  MapPinIcon,
  TrashIcon,
  XMarkIcon,
  ShieldExclamationIcon,
  ArrowUturnRightIcon,
  QueueListIcon,
  PencilIcon,
  FaceSmileIcon,
  InformationCircleIcon,
} from "react-native-heroicons/outline";
import { PlayIcon } from "react-native-heroicons/solid";
import { openRemoteFile } from "../../utils/fileUtils";
import {
  FilePdfPreview,
  FileTextPreview,
  OfficeFilePreview,
} from "./MessageItem";
import { MessageDTO } from "../../services/messageService";
import { getMessageTextContent } from "../../utils/messageUtils";
import { EMOJI_MAP } from "../../constants/Chat";
import { GroupLinkBubble } from "./GroupLinkBubble";

interface MessageContextMenuProps {
  visible: boolean;
  selectedMsg: MessageDTO | null;
  layout: { x: number; y: number; width: number; height: number } | null;
  selectedImageIndex?: number | null;
  onClose: () => void;
  onReact: (emojiKey: string) => void;
  onClearReactions: () => void;
  onCopy: () => void;
  onRevoke: () => void;
  onDeleteLocal: () => void;
  onPin: () => void;
  onUnpin: () => void;
  onReply: (msg: MessageDTO) => void;
  onReport?: (msg: MessageDTO) => void;
  onForward?: (msg: MessageDTO) => void;
  onSelectMultiple?: (msg: MessageDTO) => void;
  isPinned: boolean;
  canPin?: boolean;
  currentUserId: string;
  onEdit?: (msg: MessageDTO) => void;
}

export const MessageContextMenu = ({
  visible,
  selectedMsg,
  layout,
  selectedImageIndex,
  onClose,
  onReact,
  onClearReactions,
  onCopy,
  onRevoke,
  onDeleteLocal,
  onPin,
  onUnpin,
  onReply,
  onReport,
  onForward,
  onSelectMultiple,
  isPinned,
  canPin = true,
  currentUserId,
  onEdit,
}: MessageContextMenuProps) => {
  const router = useRouter();
  if (!visible || !selectedMsg || !layout) return null;

  const screenHeight = Dimensions.get("window").height;

  let msgTop = layout.y;
  let msgHeight = layout.height;

  // Nếu là ảnh (không thu hồi), chiều cao hiển thị trong popup luôn bị cố định là 200
  if (selectedMsg.type === "image" && !selectedMsg.isRevoked) {
    msgHeight = 200;
  }

  // Giới hạn chiều cao popup message (vd max 50% màn hình)
  const maxHeight = screenHeight * 0.5;
  if (msgHeight > maxHeight) {
    msgHeight = maxHeight;
  }

  // Đảm bảo không bị lẹm khung
  if (msgTop < 60) msgTop = 60;
  if (msgTop + msgHeight + 350 > screenHeight) {
    msgTop = Math.max(60, screenHeight - msgHeight - 350);
  }

  const isTopHalf = msgTop < screenHeight / 2;
  const isSender = selectedMsg.senderId === currentUserId;
  const hasMyReaction = selectedMsg.reactions?.some(
    (r: any) => r.userId === currentUserId,
  );

  const isWithin60Seconds =
    new Date().getTime() - new Date(selectedMsg.createdAt).getTime() <= 60000;
  const showEdit =
    selectedMsg.isRevoked &&
    selectedMsg.type === "text" &&
    isSender &&
    isWithin60Seconds;

  const textContent =
    selectedMsg.type === "text"
      ? getMessageTextContent(selectedMsg.content)
      : "";
  const GROUP_LINK_REGEX = /(?:https?:\/\/)?alo\.chat\/g\/([a-f\d]{24})/i;
  const groupMatch =
    selectedMsg.type === "text" ? textContent?.match(GROUP_LINK_REGEX) : null;
  const isTextOnlyGroupLink = groupMatch
    ? textContent.trim() === groupMatch[0].trim()
    : false;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <BlurView intensity={30} tint="dark" style={{ flex: 1 }}>
        <Pressable className="flex-1" onPress={onClose}>
          <View className="flex-1">
            {/* Highlighted Message */}
            <View
              style={{
                position: "absolute",
                top: msgTop,
                left: layout.x,
                width: layout.width,
                height: msgHeight,
              }}
            >
              <View
                className={`shadow-2xl overflow-hidden ${
                  (selectedMsg.type === "image" && !selectedMsg.isRevoked) ||
                  (selectedMsg.type === "file" && !selectedMsg.isRevoked) ||
                  selectedMsg.type === "poll" ||
                  selectedMsg.type === "contact" ||
                  isTextOnlyGroupLink
                    ? "p-0 bg-transparent flex-1"
                    : "px-5 py-3 " +
                      (isSender
                        ? "bg-black rounded-3xl rounded-br-lg flex-1"
                        : "bg-white rounded-3xl rounded-bl-lg flex-1")
                }`}
              >
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ flexGrow: 1 }}
                >
                  {selectedMsg.replyTo && selectedMsg.replyTo.messageId && (
                    <View
                      className={`mb-2 p-2 rounded-lg border-l-4 border-blue-400 ${
                        isSender ? "bg-gray-800" : "bg-gray-100"
                      }`}
                    >
                      <Text
                        className={`text-[12px] font-bold mb-0.5 ${
                          isSender ? "text-blue-300" : "text-blue-600"
                        }`}
                      >
                        {selectedMsg.replyTo.senderName || "Người dùng"}
                      </Text>
                      <Text
                        className={`text-[12px] ${
                          isSender ? "text-gray-400" : "text-gray-500"
                        }`}
                        numberOfLines={1}
                      >
                        {selectedMsg.replyTo.type === "text"
                          ? getMessageTextContent(selectedMsg.replyTo.content)
                          : selectedMsg.replyTo.type === "image" ||
                              (selectedMsg.replyTo.type === "file" &&
                                [
                                  "jpg",
                                  "jpeg",
                                  "png",
                                  "gif",
                                  "webp",
                                  "heic",
                                  "heif",
                                ].includes(
                                  selectedMsg.replyTo.content
                                    .split(".")
                                    .pop()
                                    ?.toLowerCase() || "",
                                ))
                            ? selectedMsg.replyTo.content === "[Album Ảnh]"
                              ? "[Album Ảnh]"
                              : "[Hình ảnh]"
                            : "[Tệp tin]"}
                      </Text>
                    </View>
                  )}
                  {selectedMsg.isRevoked ? (
                    <Text className="italic text-sm text-gray-400">
                      Tin nhắn đã bị thu hồi
                    </Text>
                  ) : selectedMsg.type === "image" ? (
                    (() => {
                      let imageUri = selectedMsg.content;
                      if (
                        selectedMsg.metadata?.imageGroup &&
                        selectedImageIndex !== undefined &&
                        selectedImageIndex !== null
                      ) {
                        const groupItem =
                          selectedMsg.metadata.imageGroup[selectedImageIndex];
                        if (groupItem && !groupItem.isRevoked) {
                          imageUri = groupItem.url;
                        }
                      } else if (
                        selectedMsg.metadata?.imageGroup &&
                        selectedMsg.metadata.imageGroup.length > 0
                      ) {
                        const active = selectedMsg.metadata.imageGroup.find(
                          (img: any) => !img.isRevoked,
                        );
                        if (active) imageUri = active.url;
                      }
                      return (
                        <Image
                          source={{ uri: imageUri }}
                          className="rounded-[22px] border border-gray-100/50"
                          style={{ width: 260, height: 200 }}
                          resizeMode="cover"
                        />
                      );
                    })()
                  ) : selectedMsg.type === "file" ? (
                    (() => {
                      const fileName =
                        selectedMsg.metadata?.fileName ||
                        selectedMsg.content.split("/").pop() ||
                        "";
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
                          <View
                            className="w-[260px] h-[160px] bg-black rounded-2xl justify-center items-center relative overflow-hidden"
                            style={{ alignSelf: "center" }}
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
                          </View>
                        );
                      }

                      return (
                        <View
                          className={`overflow-hidden rounded-2xl bg-white border-gray-200 border`}
                          style={{ width: 260, alignSelf: "center" }}
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
                                return (
                                  <FileTextPreview url={selectedMsg.content} />
                                );
                              } else if (isPdf) {
                                return (
                                  <FilePdfPreview url={selectedMsg.content} />
                                );
                              } else if (isOffice) {
                                return (
                                  <OfficeFilePreview
                                    url={selectedMsg.content}
                                  />
                                );
                              } else {
                                return (
                                  <View className="flex-1 items-center justify-center bg-gray-50">
                                    <InformationCircleIcon
                                      size={64}
                                      color="#CBD5E1"
                                    />
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
                                  if (
                                    ["zip", "rar", "tar", "7z"].includes(
                                      ext || "",
                                    )
                                  )
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
                                className="text-[14px] font-black text-gray-900 leading-tight"
                                numberOfLines={1}
                              >
                                {fileName}
                              </Text>
                              <Text
                                className="text-[11px] text-gray-500 font-medium mt-0.5"
                                numberOfLines={1}
                              >
                                {selectedMsg.metadata?.fileSize
                                  ? selectedMsg.metadata.fileSize < 1024 * 1024
                                    ? (
                                        selectedMsg.metadata.fileSize / 1024
                                      ).toFixed(0) + " KB"
                                    : (
                                        selectedMsg.metadata.fileSize /
                                        (1024 * 1024)
                                      ).toFixed(1) + " MB"
                                  : "0 KB"}
                              </Text>
                            </View>
                          </View>
                        </View>
                      );
                    })()
                  ) : selectedMsg.type === "poll" ? (
                    <Text
                      className={`text-base leading-6 font-medium ${isSender ? "text-white" : "text-gray-900"}`}
                    >
                      📊 [Bình chọn] {selectedMsg.content}
                    </Text>
                  ) : selectedMsg.type === "contact" ? (
                    <View
                      className="w-[260px] bg-white rounded-2xl p-4 border-gray-200 border"
                      style={{ alignSelf: "center" }}
                    >
                      <View className="flex-row items-center mb-2.5">
                        <View className="bg-blue-50 px-2 py-0.5 rounded-md">
                          <Text className="text-[10px] text-blue-600 font-black uppercase tracking-wider">
                            Danh thiếp
                          </Text>
                        </View>
                      </View>
                      <View className="flex-row items-center">
                        {selectedMsg.metadata?.contactAvatar ? (
                          <Image
                            source={{ uri: selectedMsg.metadata.contactAvatar }}
                            className="w-12 h-12 rounded-full mr-3"
                          />
                        ) : (
                          <View className="w-12 h-12 rounded-full bg-blue-100 items-center justify-center mr-3">
                            <Text className="text-blue-600 font-bold text-[16px]">
                              {(selectedMsg.metadata?.contactName || "?")
                                .charAt(0)
                                .toUpperCase()}
                            </Text>
                          </View>
                        )}
                        <View className="flex-1">
                          <Text
                            className="text-[14px] font-black text-gray-900"
                            numberOfLines={1}
                          >
                            {selectedMsg.metadata?.contactName}
                          </Text>
                          <Text
                            className="text-[11px] text-gray-500 font-medium mt-0.5"
                            numberOfLines={1}
                          >
                            {selectedMsg.metadata?.contactPhone
                              ? `SĐT: ${selectedMsg.metadata.contactPhone}`
                              : "Số điện thoại bảo mật"}
                          </Text>
                        </View>
                      </View>
                      <View className="h-[1px] bg-gray-100 mb-3 mt-4" />
                      <TouchableOpacity
                        onPress={() => {
                          onClose();
                          if (selectedMsg.metadata?.contactId) {
                            router.push({
                              pathname: "/chat/[id]",
                              params: {
                                id: selectedMsg.metadata.contactId,
                                name: selectedMsg.metadata.contactName,
                                avatar:
                                  selectedMsg.metadata.contactAvatar || "",
                              },
                            });
                          }
                        }}
                        className="w-full py-2 bg-blue-50 rounded-xl items-center justify-center flex-row"
                      >
                        <Text className="text-blue-600 font-black text-[13px]">
                          Nhắn tin
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : isTextOnlyGroupLink && groupMatch ? (
                    <GroupLinkBubble
                      msg={selectedMsg}
                      linkGroupId={groupMatch[1]}
                      isTextOnly={true}
                    />
                  ) : (
                    <Text
                      className={`text-base leading-6 ${
                        isSender ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {getMessageTextContent(selectedMsg.content)}
                    </Text>
                  )}
                </ScrollView>
              </View>
            </View>

            {/* Emoji & Menu */}
            <View
              style={{
                position: "absolute",
                left: 20,
                right: 20,
                ...(isTopHalf
                  ? { top: msgTop + msgHeight + 15 }
                  : { bottom: screenHeight - msgTop + 15 }),
                alignItems: isSender ? "flex-end" : "flex-start",
              }}
            >
              {/* Emoji Tray */}
              {!selectedMsg.isRevoked && (
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
              )}

              {/* Context Menu */}
              <View
                //@ts-ignore
                onStartShouldSetResponder={() => true}
                className="bg-white rounded-2xl w-48 shadow-2xl border border-gray-100 overflow-hidden"
              >
                {!selectedMsg.isRevoked && (
                  <TouchableOpacity
                    onPress={() => onReply(selectedMsg)}
                    className="flex-row items-center gap-3 px-4 py-3 border-b border-gray-50 active:bg-gray-50"
                  >
                    <ArrowUturnLeftIcon size={18} color="#4b5563" />
                    <Text className="text-[14px] font-medium text-gray-700">
                      Trả lời
                    </Text>
                  </TouchableOpacity>
                )}

                {!selectedMsg.isRevoked && onForward && (
                  <TouchableOpacity
                    onPress={() => onForward(selectedMsg)}
                    className="flex-row items-center gap-3 px-4 py-3 border-b border-gray-50 active:bg-gray-50"
                  >
                    <ArrowUturnRightIcon size={18} color="#4b5563" />
                    <Text className="text-[14px] font-medium text-gray-700">
                      Chuyển tiếp
                    </Text>
                  </TouchableOpacity>
                )}

                {onSelectMultiple && (
                  <TouchableOpacity
                    onPress={() => onSelectMultiple(selectedMsg)}
                    className="flex-row items-center gap-3 px-4 py-3 border-b border-gray-50 active:bg-gray-50"
                  >
                    <QueueListIcon size={18} color="#4b5563" />
                    <Text className="text-[14px] font-medium text-gray-700">
                      Chọn nhiều
                    </Text>
                  </TouchableOpacity>
                )}

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

                {!selectedMsg.isRevoked &&
                  canPin &&
                  (isPinned ? (
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
                  ))}

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
                  className="flex-row items-center gap-3 px-4 py-3 border-b border-gray-50 active:bg-red-50"
                >
                  <TrashIcon size={18} color="#ef4444" />
                  <Text className="text-[14px] font-medium text-red-500">
                    Xóa tin nhắn
                  </Text>
                </TouchableOpacity>

                {!isSender && !selectedMsg.isRevoked && onReport && (
                  <TouchableOpacity
                    onPress={() => onReport(selectedMsg)}
                    className="flex-row items-center gap-3 px-4 py-3 active:bg-red-50"
                  >
                    <ShieldExclamationIcon size={18} color="#ef4444" />
                    <Text className="text-[14px] font-medium text-red-500">
                      Báo cáo tin nhắn
                    </Text>
                  </TouchableOpacity>
                )}

                {showEdit && onEdit && (
                  <TouchableOpacity
                    onPress={() => onEdit(selectedMsg)}
                    className="flex-row items-center gap-3 px-4 py-3 border-b border-gray-50 active:bg-blue-50"
                  >
                    <PencilIcon size={18} color="#3b82f6" />
                    <Text className="text-[14px] font-medium text-blue-500">
                      Chỉnh sửa
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </Pressable>
      </BlurView>
    </Modal>
  );
};
