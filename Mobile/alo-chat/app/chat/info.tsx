// Cần đảm bảo các thư viện như "expo-router", "react-native" đã được cấu hình trong môi trường thật của dự án.
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import React, { useState, useCallback, useEffect } from "react";
import { useSocket } from "../../contexts/SocketContext";
import { GalleryViewerModal } from "../../components/chat/GalleryViewer";
import { groupService } from "../../services/groupService";
import { userService } from "../../services/userService";
import { useAuth } from "../../contexts/AuthContext";
import { messageService, MessageDTO } from "../../services/messageService";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  Modal,
  ScrollView,
} from "react-native";
import {
  ArrowLeftIcon,
  EllipsisVerticalIcon,
  BellSlashIcon,
  MapPinIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  DocumentTextIcon,
  TableCellsIcon,
  ClockIcon,
  EyeSlashIcon,
  TrashIcon,
  ChevronRightIcon,
  ArrowRightOnRectangleIcon,
  XMarkIcon,
  PencilIcon,
  CameraIcon,
  LinkIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  PencilSquareIcon,
  CalendarDaysIcon,
} from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";

export default function ChatInfoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    id,
    name,
    avatar,
    membersCount,
    isGroup: paramsIsGroup,
  } = useLocalSearchParams();
  const { user } = useAuth();
  const currentUserId = user?.id || user?._id || user?.userId || null;

  const isGroup = paramsIsGroup === "true";

  const [members, setMembers] = useState<any[]>([]);
  const [groupName, setGroupName] = useState<string>(name as string);
  const [groupAvatar, setGroupAvatar] = useState<string>(avatar as string);
  const [isTransferLeaderModalVisible, setIsTransferLeaderModalVisible] =
    useState(false);
  const [selectedNewLeaderId, setSelectedNewLeaderId] = useState<string | null>(
    null,
  );
  const [isLinkEnabled, setIsLinkEnabled] = useState(false);
  const [isHistoryVisible, setIsHistoryVisible] = useState(true);
  const [mediaList, setMediaList] = useState<MessageDTO[]>([]);
  const [fileList, setFileList] = useState<MessageDTO[]>([]);
  const [mediaCount, setMediaCount] = useState(0);
  const [fileCount, setFileCount] = useState(0);
  const [realtimeMembersCount, setRealtimeMembersCount] = useState<string>(
    (membersCount as string) || "0",
  );
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [permissions, setPermissions] = useState<any>(null);

  // States cho modal đổi tên (Fix Alert.prompt trên Android)
  const [isEditNameModalVisible, setIsEditNameModalVisible] = useState(false);
  const [tempGroupName, setTempGroupName] = useState("");

  const fetchGroupDetails = async () => {
    try {
      if (!isGroup || !id) return;
      const res = await groupService.getGroupById(id as string);

      let groupData = res;
      if (res?.data?.data) {
        groupData = res.data.data;
      } else if (res?.data) {
        groupData = res.data;
      }

      if (groupData?.name) {
        setGroupName(groupData.name);
      }
      if (groupData?.groupAvatar) {
        setGroupAvatar(groupData.groupAvatar);
      }
      if (typeof groupData?.isLinkEnabled === "boolean") {
        setIsLinkEnabled(groupData.isLinkEnabled);
      }
      if (typeof groupData?.isHistoryVisible === "boolean") {
        setIsHistoryVisible(groupData.isHistoryVisible);
      }

      if (groupData?.permissions) {
        setPermissions(groupData.permissions);
      }

      if (groupData && groupData.members) {
        const memberPromises = groupData.members.map(async (m: any) => {
          const userRes = await userService.getUserById(m.userId);
          const userData =
            userRes && (userRes as any).data ? (userRes as any).data : userRes;
          return {
            id: m.userId,
            name: userData?.fullName || "Người dùng",
            role: m.role.toLowerCase(),
            avatar: userData?.avatar || "",
          };
        });
        const membersList = await Promise.all(memberPromises);
        setMembers(membersList);
        setRealtimeMembersCount(membersList.length.toString());
      }
    } catch (error) {
      console.error("Lỗi lấy chi tiết nhóm:", error);
    }
  };

  const fetchMediaAndFiles = async () => {
    try {
      if (!id) return;

      const { messages: media } = await messageService.getMessageHistory(
        id as string,
        100,
        0,
        "image",
      );

      const getSafeTime = (item: any) => {
        const dateValue = item.createdAt || item.timestamp || item.updatedAt;
        if (!dateValue) return Date.now() + 9999999;

        const time = new Date(dateValue).getTime();
        return isNaN(time) ? Date.now() + 9999999 : time;
      };

      const sortedMedia = [...media].sort((a, b) => {
        const timeA = getSafeTime(a);
        const timeB = getSafeTime(b);
        return timeB - timeA;
      });

      setMediaList(sortedMedia);
      setMediaCount(media.length);

      const { messages: files } = await messageService.getMessageHistory(
        id as string,
        100,
        0,
        "file",
      );

      const sortedFiles = [...files].sort((a, b) => {
        const timeA = getSafeTime(a);
        const timeB = getSafeTime(b);
        return timeB - timeA;
      });

      setFileList(sortedFiles);
      setFileCount(files.length);
    } catch (error) {
      console.error("Lỗi lấy media/files:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (id) {
        fetchGroupDetails();
        fetchMediaAndFiles();
      }
    }, [id]),
  );

  const { socket } = useSocket();

  useEffect(() => {
    if (!socket || !id) return;

    const handleMessageReceived = (data: any) => {
      const newMsg = data.message ? data.message : data;
      // Socket trả về cho toàn bộ cuộc trò chuyện mà user tham gia,
      // nên cần lọc đúng conversationId đang xem
      if (newMsg.conversationId === id && !newMsg.isRevoked) {
        if (newMsg.type === "image") {
          setMediaList((prev) => {
            if (prev.find((m) => m._id === newMsg._id)) return prev;
            const updated = [newMsg, ...prev];
            // Sắp xếp lại để mục mới nhất ở đầu
            return updated
              .sort((a, b) =>
                (b.createdAt || "").localeCompare(a.createdAt || ""),
              )
              .slice(0, 100);
          });
          setMediaCount((prev) => prev + 1);
        } else if (newMsg.type === "file") {
          setFileList((prev) => {
            if (prev.find((f) => f._id === newMsg._id)) return prev;
            const updated = [newMsg, ...prev];
            return updated
              .sort((a, b) =>
                (b.createdAt || "").localeCompare(a.createdAt || ""),
              )
              .slice(0, 100);
          });
          setFileCount((prev) => prev + 1);
        }
      }
    };

    socket.on("message-received", handleMessageReceived);

    const handleGroupUpdated = (updatedGroup: any) => {
      if (updatedGroup._id === id) {
        console.log("Group updated, fetching new details...");
        fetchGroupDetails();
      }
    };

    const handleConversationRemoved = (data: {
      conversationId: string;
      groupName: string;
      reason: string;
    }) => {
      if (data.conversationId === id && data.reason !== "leave") {
        Alert.alert(
          "Thông báo",
          data.reason === "delete"
            ? `Nhóm ${data.groupName} đã được giải tán`
            : `Bạn đã bị mời ra khỏi nhóm ${data.groupName}`,
          [{ text: "OK", onPress: () => router.replace("/(tabs)") }]
        );
      }
    };

    socket.on("GROUP_UPDATED", handleGroupUpdated);
    socket.on("CONVERSATION_REMOVED", handleConversationRemoved);

    return () => {
      socket.off("message-received", handleMessageReceived);
      socket.off("GROUP_UPDATED", handleGroupUpdated);
      socket.off("CONVERSATION_REMOVED", handleConversationRemoved);
    };
  }, [socket, id]);

  const currentUserRole = members.find((m) => m.id === currentUserId)?.role;
  const isAdmin = currentUserRole === "leader";
  const isDeputy = currentUserRole === "deputy";
  const isManager = isAdmin || isDeputy;
  const canEdit = isGroup && (isManager || permissions?.editGroupInfo === "EVERYONE");
  const canCreatePoll = isGroup && (isManager || permissions?.createPolls === "EVERYONE");
  const canCreateNote = isGroup && (isManager || permissions?.createNotes === "EVERYONE");
  const canCreateReminder = isGroup && (isManager || permissions?.createReminders === "EVERYONE");
  const hasAnyUtility = canCreatePoll || canCreateNote || canCreateReminder;

  const handleLeaveGroup = () => {
    if (isAdmin) {
      const otherMembers = members.filter((m) => m.id !== currentUserId);
      if (otherMembers.length === 0) {
        Alert.alert(
          "Nhóm không còn ai",
          "Bạn là thành viên duy nhất. Vui lòng giải tán nhóm.",
        );
        return;
      }
      setIsTransferLeaderModalVisible(true);
      return;
    }

    Alert.alert("Rời nhóm", "Bạn có chắc chắn muốn rời khỏi nhóm này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Rời nhóm",
        style: "destructive",
        onPress: async () => {
          try {
            if (!currentUserId) return;
            await groupService.removeMember(id as string, currentUserId);
            Alert.alert("Thành công", "Đã rời nhóm.");
            router.replace("/(tabs)");
          } catch (error) {
            Alert.alert(
              "Lỗi",
              typeof error === "string" ? error : "Không thể rời nhóm",
            );
          }
        },
      },
    ]);
  };

  const handleClearHistory = () => {
    Alert.alert(
      "Xoá lịch sử trò chuyện",
      "Bạn có chắc chắn muốn xoá lịch sử trò chuyện này? Các tin nhắn cũ sẽ biến mất đối với bạn.",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xoá",
          style: "destructive",
          onPress: async () => {
            try {
              await groupService.clearConversation(id as string);
              Alert.alert("Thông báo", "Đã xoá lịch sử trò chuyện.", [
                {
                  text: "OK",
                  onPress: () => {
                    if (router.canDismiss()) {
                      router.dismissAll();
                    }
                    router.replace("/(tabs)");
                  },
                },
              ]);
              setMediaList([]);
              setFileList([]);
            } catch (err) {
              console.error("Lỗi xoá lịch sử:", err);
              Alert.alert("Lỗi", "Không thể xoá lịch sử trò chuyện.");
            }
          },
        },
      ],
    );
  };

  const handleTransferAndLeave = async () => {
    if (!selectedNewLeaderId || !currentUserId) {
      Alert.alert("Lỗi", "Vui lòng chọn trưởng nhóm mới");
      return;
    }
    try {
      await groupService.assignLeader(id as string, selectedNewLeaderId);
      await groupService.removeMember(id as string, currentUserId);
      setIsTransferLeaderModalVisible(false);
      Alert.alert("Thành công", "Đã chuyển quyền trưởng nhóm và rời nhóm.");
      router.replace("/(tabs)");
    } catch (error) {
      console.error(error);
      Alert.alert(
        "Lỗi",
        typeof error === "string" ? error : "Không thể thực hiện tao tác.",
      );
    }
  };

  const handleChangeAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        await groupService.updateGroup(id as string, undefined, imageUri);
        Alert.alert("Thành công", "Đã cập nhật ảnh đại diện nhóm");
        fetchGroupDetails();
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Lỗi", "Không thể cập nhật ảnh đại diện.");
    }
  };

  const handleEditName = () => {
    setTempGroupName(groupName);
    setIsEditNameModalVisible(true);
  };

  const confirmEditName = async () => {
    const trimmedName = tempGroupName?.trim();
    if (!trimmedName || trimmedName === groupName) {
      setIsEditNameModalVisible(false);
      return;
    }
    try {
      await groupService.updateGroup(id as string, trimmedName);
      setGroupName(trimmedName);
      setIsEditNameModalVisible(false);
      Alert.alert("Thành công", "Đã cập nhật tên nhóm");
      fetchGroupDetails();
    } catch (error) {
      console.error(error);
      Alert.alert("Lỗi", "Không thể cập nhật tên nhóm.");
    }
  };

  const handleDisbandGroup = () => {
    Alert.alert(
      "Giải tán nhóm",
      "Bạn có chắc chắn muốn giải tán nhóm này? Hành động này không thể hoàn tác.",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Giải tán",
          style: "destructive",
          onPress: async () => {
            try {
              await groupService.deleteGroup(id as string);
              Alert.alert("Thành công", "Nhóm đã bị giải tán.");
              router.back();
              router.back();
            } catch (error) {
              Alert.alert("Lỗi", "Không thể giải tán nhóm.");
            }
          },
        },
      ],
    );
  };

  return (
    <View className="flex-1 bg-[#fcfcfc]" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ArrowLeftIcon size={24} color="#000" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900">Thông tin</Text>
        {isGroup && isManager ? (
          <TouchableOpacity
            onPress={() => router.push(`/chat/settings?id=${id}`)}
            className="p-2 -mr-2"
          >
            <Cog6ToothIcon size={24} color="#000" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity className="p-2 -mr-2">
            <EllipsisVerticalIcon size={24} color="#000" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {/* Profile Info */}
        <View className="items-center mt-6">
          <View className="relative">
            <TouchableOpacity
              disabled={!isGroup || !canEdit}
              activeOpacity={0.7}
              onPress={handleChangeAvatar}
            >
              {groupAvatar ? (
                <Image
                  source={{ uri: groupAvatar as string }}
                  className="w-[100px] h-[100px] rounded-full bg-gray-200"
                />
              ) : (
                <View className="w-[100px] h-[100px] rounded-full bg-gray-800 items-center justify-center">
                  <Text className="text-white font-bold text-3xl">
                    {((groupName as string) || "G").charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {isGroup && canEdit ? (
              <TouchableOpacity
                onPress={handleChangeAvatar}
                className="absolute bottom-0 right-0 w-8 h-8 bg-[#f5f6f8] border-[3px] border-white rounded-full items-center justify-center shadow-sm"
              >
                <CameraIcon size={16} color="#4b5563" />
              </TouchableOpacity>
            ) : (
              !isGroup && (
                <View className="absolute bottom-1 right-2 w-[18px] h-[18px] bg-green-500 border-[3px] border-white rounded-full" />
              )
            )}
          </View>

          <View className="flex-row items-center justify-center mt-4 mb-1">
            {isGroup && !canEdit && <View className="w-0" />}
            {isGroup && canEdit && <View className="w-8" />}
            <Text className="text-[22px] font-extrabold text-gray-900 text-center">
              {groupName || (isGroup ? `Nhóm ${id}` : "Nhắn tin")}
            </Text>
            {isGroup && canEdit && (
              <TouchableOpacity
                className="ml-2 p-1 w-6 items-start"
                onPress={handleEditName}
              >
                <PencilIcon size={20} color="#6b7280" />
              </TouchableOpacity>
            )}
          </View>

          <Text className="text-[13px] text-gray-500 font-medium">
            {isGroup
              ? `${realtimeMembersCount || ""} thành viên`
              : "Đang hoạt động"}
          </Text>
        </View>

        {/* Quick Actions */}
        <View className="flex-row justify-center mt-7 gap-5 px-5">
          <ActionButton
            icon={<BellSlashIcon size={24} color="#374151" strokeWidth={1.5} />}
            label="Tắt báo"
          />
          <ActionButton
            icon={<MapPinIcon size={24} color="#374151" strokeWidth={1.5} />}
            label="Ghim"
          />
          <ActionButton
            icon={
              <MagnifyingGlassIcon
                size={24}
                color="#374151"
                strokeWidth={1.5}
              />
            }
            label="Tìm kiếm"
            onPress={() => {
              // Just go back to chat screen
              router.back();
            }}
          />
          {isGroup ? (
            <ActionButton
              icon={
                <UserGroupIcon size={24} color="#374151" strokeWidth={1.5} />
              }
              label="Thành viên"
              onPress={() => router.push(`/chat/members?id=${id}`)}
            />
          ) : (
            <ActionButton
              icon={
                <UserGroupIcon size={24} color="#374151" strokeWidth={1.5} />
              }
              label="Nhóm chung"
            />
          )}
        </View>

        {/* SECTION: ẢNH / VIDEO */}
        <View className="mt-10 px-5">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-[11px] font-bold text-gray-500 uppercase tracking-[1px]">
              Ảnh / Video
            </Text>
            <TouchableOpacity
              onPress={() => router.push(`/chat/media?id=${id}`)}
            >
              <Text className="text-[12px] font-bold text-gray-900">
                Xem tất cả
              </Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row flex-wrap -mx-[6px]">
            {mediaList.slice(0, 5).map((msg, idx) => {
              const uniqueKey = msg._id
                ? `${msg._id}-${idx}`
                : `media-fallback-${idx}-${Math.random().toString(36).substring(2)}`;
              return (
                <TouchableOpacity
                  key={uniqueKey}
                  className="w-1/3 px-[6px] mb-3"
                  activeOpacity={0.8}
                  onPress={() => setViewerIndex(idx)}
                >
                  <Image
                    source={{ uri: msg.content }}
                    className="w-full aspect-square rounded-2xl bg-gray-200"
                  />
                </TouchableOpacity>
              );
            })}

            {mediaList.length > 5 ? (
              <View className="w-1/3 px-[6px] mb-3">
                <TouchableOpacity
                  className="w-full aspect-square rounded-2xl bg-gray-300 items-center justify-center overflow-hidden"
                  activeOpacity={0.8}
                  onPress={() => router.push(`/chat/media?id=${id}`)}
                >
                  <Image
                    source={{ uri: mediaList[5].content }}
                    className="w-full h-full absolute opacity-40"
                  />
                  <Text className="text-white font-bold text-[22px] z-10 shadow-sm">
                    +{mediaList.length - 5}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : mediaList.length === 0 ? (
              <View className="w-full px-[6px]">
                <Text className="text-gray-400 text-[13px] italic py-2">
                  Chưa có ảnh hoặc video
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* SECTION: FILE */}
        <View className="mt-8 px-5">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-[11px] font-bold text-gray-500 uppercase tracking-[1px]">
              File
            </Text>
            <TouchableOpacity
              onPress={() => router.push(`/chat/media?id=${id}&tab=file`)}
            >
              <Text className="text-[12px] font-bold text-gray-900">
                Xem tất cả
              </Text>
            </TouchableOpacity>
          </View>

          {/* Wrapper for cards */}
          <View className="bg-[#f5f6f8] rounded-[24px]">
            {fileList.length > 0 ? (
              fileList.slice(0, 3).map((file, index) => {
                const uniqueKey = file._id
                   ? `${file._id}-${index}`
                  : `file-fallback-${index}-${Math.random().toString(36).substring(2)}`;
                return (
                  <View key={uniqueKey}>
                    <FileItem
                      icon={
                        file.metadata?.fileType?.includes("pdf") ? (
                          <DocumentTextIcon size={24} color="#10b981" />
                        ) : (
                          <TableCellsIcon size={24} color="#3b82f6" />
                        )
                      }
                      title={file.metadata?.fileName || "Không tên"}
                      info={`${
                        file.metadata?.fileSize
                          ? (file.metadata.fileSize / (1024 * 1024)).toFixed(
                              1,
                            ) + " MB"
                          : "0 MB"
                      } • ${file.createdAt ? new Date(file.createdAt).toLocaleDateString("vi-VN") : "Vừa xong"}`}
                    />
                    {index < Math.min(fileList.length, 3) - 1 && (
                      <View className="h-[1px] bg-white w-[90%] self-end" />
                    )}
                  </View>
                );
              })
            ) : (
              <View className="p-5 items-center">
                <Text className="text-gray-400 text-[13px] italic">
                  Chưa có file nào
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* SECTION: TIỆN ÍCH NHÓM */}
        {isGroup && hasAnyUtility && (
          <View className="mt-10 px-5">
            <Text className="text-[11px] font-bold text-gray-500 uppercase tracking-[1px] mb-4">
              Tiện ích nhóm
            </Text>

            <View className="bg-[#f5f6f8] rounded-[24px]">
              {canCreatePoll && (
                <>
                  <SettingItem
                    icon={<ChartBarIcon size={24} color="#4b5563" />}
                    title="Tạo bình chọn"
                    onPress={() => router.push(`/chat/create-poll?id=${id}`)}
                  />
                  <View className="h-[1px] bg-white w-[90%] self-end" />
                </>
              )}
              {canCreateNote && (
                <>
                  <SettingItem
                    icon={<PencilSquareIcon size={24} color="#4b5563" />}
                    title="Tạo ghi chú"
                    onPress={() => Alert.alert("Thông báo", "Tính năng Tạo ghi chú đang được phát triển.")}
                  />
                  <View className="h-[1px] bg-white w-[90%] self-end" />
                </>
              )}
              {canCreateReminder && (
                <SettingItem
                  icon={<CalendarDaysIcon size={24} color="#4b5563" />}
                  title="Tạo nhắc hẹn"
                  onPress={() => Alert.alert("Thông báo", "Tính năng Tạo nhắc hẹn đang được phát triển.")}
                />
              )}
            </View>
          </View>
        )}

        {/* SECTION: THÔNG TIN KHÁC */}
        {isGroup && (
          <View className="mt-10 px-5">
            <Text className="text-[11px] font-bold text-gray-500 uppercase tracking-[1px] mb-4">
              Thông tin khác
            </Text>

            <View className="bg-[#f5f6f8] rounded-[24px]">
              {isManager && (
                <>
                  <SettingItem
                    icon={<Cog6ToothIcon size={24} color="#4b5563" />}
                    title="Cài đặt nhóm"
                    onPress={() => router.push(`/chat/settings?id=${id}`)}
                  />
                  <View className="h-[1px] bg-white w-[90%] self-end" />
                </>
              )}
              <SettingItem
                icon={<LinkIcon size={24} color="#4b5563" />}
                title="Link tham gia nhóm"
                onPress={() =>
                  router.push(
                    `/chat/link?id=${id}&name=${encodeURIComponent(
                      (groupName as string) || "",
                    )}&avatar=${encodeURIComponent(
                      (groupAvatar as string) || "",
                    )}&isLinkEnabled=${isLinkEnabled}&isHistoryVisible=${isHistoryVisible}&isAdmin=${isAdmin || isDeputy}`,
                  )
                }
              />
            </View>
          </View>
        )}

        {/* SECTION: THIẾT LẬP BẢO MẬT */}
        <View className="mt-10 px-5 pb-8">
          <Text className="text-[11px] font-bold text-gray-500 uppercase tracking-[1px] mb-4">
            Thiết lập bảo mật
          </Text>

          <View className="bg-[#f5f6f8] rounded-[24px]">
            <SettingItem
              icon={<ClockIcon size={24} color="#4b5563" />}
              title="Tin nhắn tự xóa"
              value="Tắt"
            />
            <View className="h-[1px] bg-white w-[90%] self-end" />
            <SettingItem
              icon={<EyeSlashIcon size={24} color="#4b5563" />}
              title="Ẩn trò chuyện"
            />
            <View className="h-[1px] bg-white w-full" />
            <SettingItem
              icon={<TrashIcon size={24} color="#ef4444" />}
              title="Xóa lịch sử trò chuyện"
              isDestructive
              onPress={handleClearHistory}
            />
          </View>
        </View>

        {isGroup && (
          <>
            {/* SECTION: RỜI / GIẢI TÁN NHÓM */}
            <View className="px-5 mt-10 pb-12">
              <View className="bg-[#fef2f2] rounded-[24px]">
                <SettingItem
                  icon={<ArrowRightOnRectangleIcon size={24} color="#ef4444" />}
                  title="Rời khỏi nhóm"
                  isDestructive
                  onPress={handleLeaveGroup}
                />
                {isAdmin && (
                  <>
                    <View className="h-[1px] bg-white w-full" />
                    <SettingItem
                      icon={<XMarkIcon size={24} color="#ef4444" />}
                      title="Giải tán nhóm"
                      isDestructive
                      onPress={handleDisbandGroup}
                    />
                  </>
                )}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Modal Chuyển quyền trưởng nhóm */}
      <Modal
        visible={isTransferLeaderModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsTransferLeaderModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl min-h-[50%] p-5">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-bold">Chọn trưởng nhóm mới</Text>
              <TouchableOpacity
                onPress={() => setIsTransferLeaderModalVisible(false)}
              >
                <XMarkIcon size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <ScrollView className="mb-4 flex-1">
              {members
                .filter((m) => m.id !== currentUserId)
                .map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    className={`flex-row items-center p-3 rounded-xl mb-2 border ${
                      selectedNewLeaderId === m.id
                        ? "border-[#007AFF] bg-[#007AFF]/10"
                        : "border-gray-200"
                    }`}
                    onPress={() => setSelectedNewLeaderId(m.id)}
                  >
                    <Image
                      source={{
                        uri: m.avatar || "https://i.pravatar.cc/150",
                      }}
                      className="w-10 h-10 rounded-full"
                    />
                    <Text className="ml-3 text-base flex-1">{m.name}</Text>
                    <View
                      className={`w-5 h-5 rounded-full border items-center justify-center ${
                        selectedNewLeaderId === m.id
                          ? "border-[#007AFF]"
                          : "border-gray-400"
                      }`}
                    >
                      {selectedNewLeaderId === m.id && (
                        <View className="w-3 h-3 rounded-full bg-[#007AFF]" />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
            </ScrollView>
            <TouchableOpacity
              className="bg-red-500 rounded-xl py-4 items-center mb-4"
              onPress={handleTransferAndLeave}
            >
              <Text className="text-white font-bold text-base">
                Chuyển quyền và rời nhóm
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Đổi tên nhóm (Fix Alert.prompt trên Android) */}
      <Modal
        visible={isEditNameModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsEditNameModalVisible(false)}
      >
        <View className="flex-1 justify-center bg-black/40 px-6">
          <View className="bg-white rounded-[24px] p-6 shadow-xl">
            <Text className="text-lg font-bold text-gray-900 mb-2">Đổi tên nhóm</Text>
            <Text className="text-[13px] text-gray-500 mb-4">
              Nhập tên nhóm mới để mọi người dễ dàng nhận diện.
            </Text>
            
            <TextInput
              className="bg-gray-100 rounded-xl px-4 py-3 text-base text-gray-900 mb-6 border border-gray-200"
              placeholder="Nhập tên nhóm..."
              value={tempGroupName}
              onChangeText={setTempGroupName}
              autoFocus
            />

            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 bg-gray-100 py-3.5 rounded-xl items-center"
                onPress={() => setIsEditNameModalVisible(false)}
              >
                <Text className="text-gray-600 font-bold">Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-[#007AFF] py-3.5 rounded-xl items-center"
                onPress={confirmEditName}
              >
                <Text className="text-white font-bold">Lưu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <GalleryViewerModal
        images={mediaList}
        initialIndex={viewerIndex ?? 0}
        visible={viewerIndex !== null}
        onClose={() => setViewerIndex(null)}
        onIndexChange={(idx) => setViewerIndex(idx)}
      />
    </View>
  );
}

// --- Các Component Phụ ---

function ActionButton({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      className="items-center w-[72px]"
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View className="w-14 h-14 bg-[#f5f6f8] rounded-full items-center justify-center mb-2">
        {icon}
      </View>
      <Text className="text-[11px] text-gray-600 font-medium text-center leading-tight">
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function FileItem({
  icon,
  title,
  info,
}: {
  icon: React.ReactNode;
  title: string;
  info: string;
}) {
  return (
    <TouchableOpacity
      className="flex-row items-center p-4 px-5"
      activeOpacity={0.7}
    >
      <View className="w-12 h-12 bg-white rounded-full items-center justify-center shadow-sm">
        {icon}
      </View>
      <View className="ml-4 flex-1">
        <Text
          className="text-[14px] font-bold text-gray-900 mb-0.5"
          numberOfLines={1}
        >
          {title}
        </Text>
        <Text className="text-[12px] text-gray-500 font-medium">{info}</Text>
      </View>
      <ChevronRightIcon size={18} color="#9ca3af" />
    </TouchableOpacity>
  );
}

function SettingItem({
  icon,
  title,
  value,
  isDestructive,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  value?: string;
  isDestructive?: boolean;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      className="flex-row items-center p-4 px-5"
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View
        className={`w-11 h-11 rounded-full items-center justify-center bg-white shadow-sm border border-gray-50`}
      >
        {icon}
      </View>
      <Text
        className={`ml-4 flex-1 text-[15px] font-medium ${
          isDestructive ? "text-red-600" : "text-gray-800"
        }`}
      >
        {title}
      </Text>
      {value && (
        <Text className="text-[13px] font-medium text-gray-500 mr-2">
          {value}
        </Text>
      )}
      {!isDestructive && <ChevronRightIcon size={18} color="#9ca3af" />}
    </TouchableOpacity>
  );
}
