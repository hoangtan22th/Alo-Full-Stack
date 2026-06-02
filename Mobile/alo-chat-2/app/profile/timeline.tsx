import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Dimensions,
  DeviceEventEmitter,
  Modal,
  TextInput,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../services/api";
import {
  postService,
  IPost,
  IStory,
  IStoryGroup,
} from "../../services/postService";
import { userService, UserProfileDTO } from "../../services/userService";
import { contactService } from "../../services/contactService";
import PostCard from "../../components/PostCard";
import { LinearGradient } from "expo-linear-gradient";
import StoryViewerModal from "../../components/feed/StoryViewerModal";

export default function UserTimelineScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id: queryUserId, userId: paramUserId } = useLocalSearchParams<{
    id?: string;
    userId?: string;
  }>();
  const { user: currentUser, refreshUser } = useAuth();

  const currentUserId = currentUser?.id || currentUser?._id;
  const targetUserId = queryUserId || paramUserId || currentUserId;
  const isMe = targetUserId === currentUserId;

  const [profile, setProfile] = useState<UserProfileDTO | null>(null);
  const [posts, setPosts] = useState<IPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [skip, setSkip] = useState(0);
  const [relationStatus, setRelationStatus] = useState<
    "FRIEND" | "NOT_FRIEND" | "I_SENT_REQUEST" | "THEY_SENT_REQUEST" | "LOADING"
  >("LOADING");
  const [friendshipId, setFriendshipId] = useState<string | null>(null);
  const [message, setMessage] = useState("Xin chào, mình muốn kết bạn với bạn!");
  const [actionLoading, setActionLoading] = useState(false);
  const isFriend = relationStatus === "FRIEND";
  const [imageRefreshKey, setImageRefreshKey] = useState(Date.now());
  const [userStories, setUserStories] = useState<IStory[]>([]);
  const [viewingStoryGroupIndex, setViewingStoryGroupIndex] = useState<
    number | null
  >(null);
  const [showUserInfoModal, setShowUserInfoModal] = useState(false);

  const hasUnviewed = userStories.some(
    (s) =>
      !s.viewers?.some(
        (v) => v.userId?.toLowerCase() === currentUserId?.toLowerCase(),
      ),
  );

  const LIMIT = 10;

  const loadProfile = async () => {
    try {
      const userProfile = await userService.getUserById(targetUserId);
      setProfile(userProfile);

      if (!isMe) {
        const friendsList = await contactService.getFriendsList();
        const friendItem = friendsList.find(
          (f: any) => f.requesterId === targetUserId || f.recipientId === targetUserId,
        );
        if (friendItem) {
          setRelationStatus("FRIEND");
          setFriendshipId(friendItem.id);
        } else {
          const pending = await contactService.getPendingRequests();
          const receivedReq = pending.find((r: any) => String(r.requesterId) === String(targetUserId));
          if (receivedReq) {
            setRelationStatus("THEY_SENT_REQUEST");
            setFriendshipId(receivedReq.id);
          } else {
            const sent = await contactService.getSentRequests();
            const sentReq = sent.find((r: any) => String(r.recipientId) === String(targetUserId));
            if (sentReq) {
              setRelationStatus("I_SENT_REQUEST");
              setFriendshipId(sentReq.id);
            } else {
              setRelationStatus("NOT_FRIEND");
              setFriendshipId(null);
            }
          }
        }
      }
    } catch (error) {
      console.error("Lỗi khi tải thông tin cá nhân:", error);
    }
  };

  const uploadImage = async (uri: string, isAvatar: boolean) => {
    try {
      // Dùng chung loading của màn hình
      const formData = new FormData();
      const filename = uri.split("/").pop() || "image.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      // @ts-ignore
      formData.append("file", { uri, name: filename, type });

      const endpoint = isAvatar ? "/users/me/avatar" : "/users/me/cover";
      await api.post(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setImageRefreshKey(Date.now());
      await refreshUser();
      await loadProfile(); // Cập nhật lại state profile
      Alert.alert(
        "Thành công",
        `Cập nhật ${isAvatar ? "ảnh đại diện" : "ảnh bìa"} thành công!`,
      );
    } catch (err) {
      console.error("Lỗi tải ảnh:", err);
      Alert.alert("Lỗi", "Không thể tải ảnh lên. Vui lòng thử lại sau.");
    }
  };

  const pickImage = async (isAvatar: boolean) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Cấp quyền",
        "Chúng tôi cần quyền truy cập thư viện ảnh để đổi avatar/ảnh bìa.",
      );
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: isAvatar ? [1, 1] : [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      await uploadImage(result.assets[0].uri, isAvatar);
    }
  };

  const fetchTimelinePosts = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    }

    try {
      const currentSkip = 0;
      const data = await postService.getUserTimeline(
        targetUserId,
        LIMIT,
        currentSkip,
      );
      setPosts(data);
      setSkip(LIMIT);
      setHasMore(data.length === LIMIT);
    } catch (error) {
      console.error("Lỗi khi tải dòng thời gian bài đăng:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchUserStories = async () => {
    try {
      const stories = await postService.getUserStories(targetUserId);
      setUserStories(stories || []);
    } catch (error) {
      console.error("Lỗi khi tải story cá nhân:", error);
    }
  };

  const init = async () => {
    setLoading(true);
    await Promise.all([
      loadProfile(),
      fetchTimelinePosts(),
      fetchUserStories(),
    ]);
    setLoading(false);
  };

  useEffect(() => {
    init();
  }, [targetUserId]);

  // ============ Real-time Post Synchronization ============
  useEffect(() => {
    const newPostSub = DeviceEventEmitter.addListener(
      "new_post_received",
      (newPost: IPost) => {
        if (newPost && newPost._id && newPost.userId === targetUserId) {
          setPosts((prev) => {
            if (prev.some((p) => p._id === newPost._id)) return prev;
            return [newPost, ...prev];
          });
        }
      },
    );

    const deletedPostSub = DeviceEventEmitter.addListener(
      "post_deleted_received",
      (data: { postId: string }) => {
        if (data?.postId) {
          setPosts((prev) => prev.filter((p) => p._id !== data.postId));
        }
      },
    );

    const interactionSub = DeviceEventEmitter.addListener(
      "post_interaction",
      (data: any) => {
        if (data?.postId && data?.payload) {
          setPosts((prev) =>
            prev.map((p) => {
              if (p._id === data.postId) {
                return {
                  ...p,
                  reactions: data.payload.reactions || p.reactions,
                  reactionCount: data.payload.reactionCount ?? p.reactionCount,
                  commentCount: data.payload.commentCount ?? p.commentCount,
                  likes: data.payload.likes || p.likes,
                  likeCount: data.payload.likeCount ?? p.likeCount,
                };
              }
              return p;
            }),
          );
        }
      },
    );

    return () => {
      newPostSub.remove();
      deletedPostSub.remove();
      interactionSub.remove();
    };
  }, [targetUserId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadProfile(),
      fetchTimelinePosts(true),
      fetchUserStories(),
    ]);
    setRefreshing(false);
  };

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      const data = await postService.getUserTimeline(targetUserId, LIMIT, skip);
      if (data.length > 0) {
        setPosts((prev) => [...prev, ...data]);
        setSkip((prev) => prev + LIMIT);
        setHasMore(data.length === LIMIT);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Lỗi khi tải thêm bài đăng dòng thời gian:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleDeletePost = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p._id !== postId));
  };

  const handleLikeUpdate = (updatedPost: IPost) => {
    setPosts((prev) =>
      prev.map((p) =>
        p._id === updatedPost._id
          ? { ...p, likes: updatedPost.likes, likeCount: updatedPost.likeCount }
          : p,
      ),
    );
  };

  const handleUnfriend = () => {
    if (!friendshipId || !profile) return;
    Alert.alert(
      "Hủy kết bạn",
      `Bạn có chắc chắn muốn hủy kết bạn với ${profile.fullName}?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Hủy kết bạn",
          style: "destructive",
          onPress: async () => {
            try {
              await contactService.removeFriend(targetUserId);
              setRelationStatus("NOT_FRIEND");
              setFriendshipId(null);
              Alert.alert("Thành công", "Đã hủy kết bạn.");
              fetchTimelinePosts();
            } catch (e) {
              Alert.alert("Lỗi", "Không thể thực hiện hủy kết bạn.");
            }
          },
        },
      ],
    );
  };

  const handleSendRequest = async () => {
    if (!targetUserId) return;
    setActionLoading(true);
    try {
      const res = await contactService.sendFriendRequest(targetUserId, message);
      if (res) {
        Alert.alert("Thành công", "Đã gửi lời mời kết bạn");
        setRelationStatus("I_SENT_REQUEST");
        loadProfile();
      } else {
        Alert.alert("Lỗi", "Gửi lời mời thất bại");
      }
    } catch (error) {
      Alert.alert("Lỗi", "Có lỗi xảy ra");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeRequest = async () => {
    if (!targetUserId) return;
    setActionLoading(true);
    try {
      const res = await contactService.revokeRequest(targetUserId);
      if (res) {
        Alert.alert("Thành công", "Đã thu hồi lời mời");
        setRelationStatus("NOT_FRIEND");
      } else {
        Alert.alert("Lỗi", "Thu hồi thất bại");
      }
    } catch (error) {
      Alert.alert("Lỗi", "Có lỗi xảy ra");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptRequest = async () => {
    if (!friendshipId) return;
    setActionLoading(true);
    try {
      const res = await contactService.acceptRequest(friendshipId);
      if (res) {
        Alert.alert("Thành công", "Đã trở thành bạn bè");
        setRelationStatus("FRIEND");
      } else {
        Alert.alert("Lỗi", "Chấp nhận lời mời thất bại");
      }
    } catch (error) {
      Alert.alert("Lỗi", "Không thể chấp nhận lời mời");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclineRequest = async () => {
    if (!friendshipId) return;
    setActionLoading(true);
    try {
      const res = await contactService.declineRequest(friendshipId);
      if (res) {
        Alert.alert("Thành công", "Đã từ chối lời mời");
        setRelationStatus("NOT_FRIEND");
        setFriendshipId(null);
      } else {
        Alert.alert("Lỗi", "Từ chối thất bại");
      }
    } catch (error) {
      Alert.alert("Lỗi", "Có lỗi xảy ra");
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartChat = () => {
    if (!profile) return;
    router.push({
      pathname: "/chat/[id]",
      params: {
        id: targetUserId,
        name: profile.fullName,
        avatar: profile.avatar || "",
      },
    });
  };

  const renderHeader = () => {
    const displayProfile = isMe ? profile || currentUser : profile;
    const rawAvatar = displayProfile?.avatar;
    const rawCover = displayProfile?.coverImage;
    const avatarUri = rawAvatar
      ? `${rawAvatar}?t=${imageRefreshKey}`
      : `https://ui-avatars.com/api/?name=${encodeURIComponent(displayProfile?.fullName || "U")}&background=E5E7EB&color=374151&rounded=true`;
    const coverUri = rawCover
      ? `${rawCover}?t=${imageRefreshKey}`
      : "https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=600";

    return (
      <View className="bg-[#f9fafb] pb-4">
        <View className="h-56 w-full bg-blue-100 relative">
          <Image
            source={{ uri: coverUri }}
            className="w-full h-full object-cover"
          />
          {isMe && (
            <TouchableOpacity
              className="absolute bottom-3 right-3 bg-[#e4e6eb] w-9 h-9 rounded-full justify-center items-center shadow-sm"
              style={{ zIndex: 50 }}
              onPress={() => pickImage(false)}
            >
              <Feather name="camera" size={18} color="#000" />
            </TouchableOpacity>
          )}
        </View>

        <View className="w-full">
          <View className="items-center">
            {userStories.length > 0 ? (
              <TouchableOpacity
                onPress={() => setViewingStoryGroupIndex(0)}
                className="-mt-[64px] w-[128px] h-[128px] rounded-full justify-center items-center"
                activeOpacity={0.9}
              >
                {hasUnviewed ? (
                  <LinearGradient
                    colors={["#3b82f6", "#a855f7", "#ec4899"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      width: 128,
                      height: 128,
                      borderRadius: 64,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <View className="w-[120px] h-[120px] rounded-full border-4 border-white bg-white relative overflow-hidden">
                      <Image
                        source={{ uri: avatarUri }}
                        className="w-full h-full rounded-full"
                      />
                    </View>
                  </LinearGradient>
                ) : (
                  <View
                    style={{
                      width: 128,
                      height: 128,
                      borderRadius: 64,
                      backgroundColor: "#d1d5db",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <View className="w-[120px] h-[120px] rounded-full border-4 border-white bg-white relative overflow-hidden">
                      <Image
                        source={{ uri: avatarUri }}
                        className="w-full h-full rounded-full"
                      />
                    </View>
                  </View>
                )}
                {isMe && (
                  <TouchableOpacity
                    className="absolute bottom-1 right-1 bg-[#e4e6eb] w-8 h-8 rounded-full justify-center items-center border-[3px] border-white shadow-sm"
                    style={{ zIndex: 10 }}
                    onPress={() => pickImage(true)}
                  >
                    <Feather name="camera" size={14} color="#000" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            ) : (
              <View className="-mt-[60px] w-[120px] h-[120px] rounded-full border-4 border-white bg-white relative shadow-sm">
                <Image
                  source={{ uri: avatarUri }}
                  className="w-full h-full rounded-full"
                />
                {isMe && (
                  <TouchableOpacity
                    className="absolute bottom-0 right-0 bg-[#e4e6eb] w-8 h-8 rounded-full justify-center items-center border-[3px] border-white shadow-sm"
                    onPress={() => pickImage(true)}
                  >
                    <Feather name="camera" size={14} color="#000" />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          <View className="items-center mt-3 px-5 pb-5">
            <View className="flex-row items-center justify-center gap-2">
              <Text className="text-[22px] font-bold text-gray-900 text-center">
                {displayProfile?.fullName || "Đang tải..."}
              </Text>
              {isMe && (
                <View className="bg-blue-50 px-2 py-0.5 rounded-full">
                  <Text className="text-[10px] font-black text-blue-700 uppercase tracking-wider">
                    BẠN
                  </Text>
                </View>
              )}
            </View>
            {displayProfile?.bio ? (
              <Text className="text-[15px] text-gray-700 mt-2 text-center px-4 leading-5">
                {displayProfile?.bio}
              </Text>
            ) : null}
            {!isMe && (
              <View className="flex-row items-center justify-center gap-1.5 mt-2">
                <Ionicons
                  name={isFriend ? "checkmark-circle" : "person-add"}
                  size={14}
                  color={isFriend ? "#2563eb" : "#9ca3af"}
                />
                <Text
                  className={`text-[14px] font-semibold ${isFriend ? "text-blue-600" : "text-gray-400"}`}
                >
                  {relationStatus === "FRIEND" ? "Bạn bè" :
                   relationStatus === "I_SENT_REQUEST" ? "Đã gửi lời mời" :
                   relationStatus === "THEY_SENT_REQUEST" ? "Chờ phản hồi" :
                   relationStatus === "LOADING" ? "Đang tải..." :
                   "Chưa kết bạn"}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View className="flex-row px-5 gap-3.5 mb-5 mt-2 justify-start">
          {isMe ? (
            <TouchableOpacity
              className="flex-row bg-white border border-gray-200 px-4 py-2.5 rounded-full items-center justify-center flex-1 gap-2"
              onPress={() =>
                router.push({
                  pathname: "/profile/personal-info",
                  params: { from: "timeline" },
                })
              }
            >
              <Ionicons name="create-outline" size={16} color="#4b5563" />
              <Text className="text-sm font-semibold text-gray-700">
                Chỉnh sửa thông tin
              </Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                className="flex-row bg-blue-600 px-5 py-2.5 rounded-full items-center justify-center flex-1 gap-2"
                onPress={handleStartChat}
              >
                <Ionicons name="chatbubble" size={16} color="white" />
                <Text className="text-sm font-semibold text-white">
                  Nhắn tin
                </Text>
              </TouchableOpacity>

              {isFriend && (
                <TouchableOpacity
                  className="flex-row bg-white border border-gray-200 px-4 py-2.5 rounded-full items-center justify-center gap-2"
                  onPress={handleUnfriend}
                >
                  <Ionicons
                    name="person-remove-outline"
                    size={16}
                    color="#ef4444"
                  />
                  <Text className="text-sm font-semibold text-red-500">
                    Hủy kết bạn
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                className="flex-row bg-white border border-gray-200 px-4 py-2.5 rounded-full items-center justify-center gap-2"
                onPress={() => setShowUserInfoModal(true)}
              >
                <Ionicons name="information-circle-outline" size={16} color="#4b5563" />
              </TouchableOpacity>
            </>
          )}
        </View>

        {!isMe && relationStatus === "NOT_FRIEND" && (
          <View className="px-5 mb-4 items-center w-full">
            <View className="w-full mb-3">
              <Text className="text-[13px] font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">
                Lời nhắn kết bạn
              </Text>
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="Nhập lời nhắn..."
                className="w-full bg-[#f4f5f7] px-4 py-3.5 rounded-2xl text-[15px] text-gray-800"
                maxLength={150}
              />
            </View>
            <TouchableOpacity
              className="w-full bg-blue-500 rounded-full py-3.5 items-center justify-center flex-row space-x-2"
              onPress={handleSendRequest}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="person-add" size={18} color="#fff" />
                  <Text className="text-white font-bold text-[15px] ml-1">
                    Kết bạn
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {!isMe && relationStatus === "I_SENT_REQUEST" && (
          <View className="px-5 mb-4 items-center w-full">
            <View className="bg-gray-100 rounded-full py-3 w-full mb-3 items-center">
              <Text className="text-gray-600 font-medium">Đã gửi lời mời kết bạn</Text>
            </View>
            <TouchableOpacity
              className="w-full bg-gray-200 rounded-full py-3.5 items-center justify-center"
              onPress={handleRevokeRequest}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#1f2937" size="small" />
              ) : (
                <Text className="text-gray-800 font-bold text-[15px]">Thu hồi lời mời</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {!isMe && relationStatus === "THEY_SENT_REQUEST" && (
          <View className="px-5 mb-4 items-center w-full">
            <Text className="text-gray-800 text-[14px] mb-3 text-center">
              <Text className="font-semibold">{profile?.fullName}</Text> muốn kết bạn với bạn
            </Text>
            <View className="flex-row w-full justify-between gap-3">
              <TouchableOpacity
                className="flex-1 bg-blue-500 rounded-full py-3 items-center justify-center flex-row"
                onPress={handleAcceptRequest}
                disabled={actionLoading}
              >
                <Ionicons name="checkmark" size={18} color="#fff" />
                <Text className="text-white font-bold text-[14px] ml-1">Chấp nhận</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-gray-200 rounded-full py-3 items-center justify-center flex-row"
                onPress={handleDeclineRequest}
                disabled={actionLoading}
              >
                <Ionicons name="close" size={18} color="#4b5563" />
                <Text className="text-gray-700 font-bold text-[14px] ml-1">Từ chối</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {isMe && (
          <View className="bg-white mx-4 p-4 rounded-3xl flex-row items-center border border-gray-200 gap-3 mb-2">
            <TouchableOpacity
              className="flex-1 bg-gray-50 border border-gray-100 py-2 px-4 rounded-full"
              onPress={() => router.push("/posts/create")}
            >
              <Text className="text-gray-400 text-sm">
                Hôm nay bạn thế nào?
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/posts/create")}
              className="p-1"
            >
              <Ionicons name="camera-outline" size={24} color="#4b5563" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "white",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color="#000" />
        <Text className="mt-2 text-gray-400 text-sm">
          Đang tải trang cá nhân...
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      {/* Floating Back Button */}
      <TouchableOpacity
        className="absolute w-10 h-10 rounded-full bg-black/40 items-center justify-center shadow-sm"
        style={{ top: insets.top + 10, left: 16, zIndex: 100 }}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={20} color="white" />
      </TouchableOpacity>

      <FlatList
        data={posts}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onDeleteSuccess={handleDeletePost}
            onLikeUpdate={handleLikeUpdate}
          />
        )}
        ListHeaderComponent={renderHeader()}
        contentContainerStyle={{
          paddingBottom: 50,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#000"]}
            tintColor="#000"
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator size="small" color="#9ca3af" className="py-4" />
          ) : null
        }
        ListEmptyComponent={
          <View className="items-center justify-center py-20 px-10">
            <Ionicons name="images-outline" size={48} color="#d1d5db" />
            <Text className="text-gray-400 text-sm mt-3 text-center">
              Chưa có bài đăng nào trên dòng thời gian.
            </Text>
          </View>
        }
      />
      
      {/* User Info Modal */}
      <Modal
        visible={showUserInfoModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowUserInfoModal(false)}
      >
        <TouchableOpacity
          className="flex-1 justify-center items-center bg-black/50 px-5"
          activeOpacity={1}
          onPress={() => setShowUserInfoModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            className="bg-white w-full rounded-3xl p-6 shadow-xl"
            onPress={() => {}}
          >
            <View className="flex-row justify-between items-center mb-5 border-b border-gray-100 pb-3">
              <Text className="text-lg font-bold text-gray-900">Thông tin chi tiết</Text>
              <TouchableOpacity onPress={() => setShowUserInfoModal(false)}>
                <Ionicons name="close-circle" size={24} color="#9ca3af" />
              </TouchableOpacity>
            </View>
            
            <View className="gap-4">
              <View>
                <Text className="text-xs font-bold text-gray-400 mb-1 tracking-wide">HỌ VÀ TÊN</Text>
                <Text className="text-base text-gray-800 font-medium">{profile?.fullName || "Chưa cập nhật"}</Text>
              </View>
              
              <View>
                <Text className="text-xs font-bold text-gray-400 mb-1 tracking-wide">GIỚI TÍNH</Text>
                <Text className="text-base text-gray-800 font-medium">
                  {String(profile?.gender) === "MALE" || profile?.gender === 0 || String(profile?.gender) === "0" ? "Nam" :
                   String(profile?.gender) === "FEMALE" || profile?.gender === 1 || String(profile?.gender) === "1" ? "Nữ" : "Khác"}
                </Text>
              </View>
              
              <View>
                <Text className="text-xs font-bold text-gray-400 mb-1 tracking-wide">NGÀY SINH</Text>
                <Text className="text-base text-gray-800 font-medium">
                  {profile?.dateOfBirth ? profile.dateOfBirth.split("-").reverse().join("/") : "Chưa cập nhật"}
                </Text>
              </View>

              <View>
                <Text className="text-xs font-bold text-gray-400 mb-1 tracking-wide">SỐ ĐIỆN THOẠI</Text>
                <Text className="text-base text-gray-800 font-medium">{profile?.phoneNumber || "Chưa cập nhật"}</Text>
              </View>

              <View>
                <Text className="text-xs font-bold text-gray-400 mb-1 tracking-wide">EMAIL</Text>
                <Text className="text-base text-gray-800 font-medium">{profile?.email || "Chưa cập nhật"}</Text>
              </View>

              <View>
                <Text className="text-xs font-bold text-gray-400 mb-1 tracking-wide">TIỂU SỬ</Text>
                <Text className="text-base text-gray-800 font-medium">{profile?.bio || "Chưa có tiểu sử"}</Text>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {viewingStoryGroupIndex !== null && userStories.length > 0 && (
        <StoryViewerModal
          storyGroups={[
            {
              userId: targetUserId,
              stories: userStories,
            },
          ]}
          initialGroupIndex={viewingStoryGroupIndex}
          userProfiles={{
            [targetUserId]: profile || (currentUser as UserProfileDTO),
          }}
          onClose={() => setViewingStoryGroupIndex(null)}
          onStoryDeleted={() => {
            fetchUserStories();
            setViewingStoryGroupIndex(null);
          }}
          onStoryViewed={() => {
            fetchUserStories();
          }}
          onStoryReacted={() => {
            fetchUserStories();
          }}
        />
      )}
    </View>
  );
}
