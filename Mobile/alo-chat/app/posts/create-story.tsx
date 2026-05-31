import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Audio } from "expo-av";
import { postService } from "../../services/postService";

interface PickedFile {
  uri: string;
  type: string;
  fileName: string;
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: { images: { url: string }[]; name: string };
  preview_url: string | null;
  uri: string;
}

export default function CreateStoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [file, setFile] = useState<PickedFile | null>(null);
  const [caption, setCaption] = useState("");
  const [privacy, setPrivacy] = useState<"PUBLIC" | "FRIENDS_ONLY" | "PRIVATE">("FRIENDS_ONLY");
  const [duration, setDuration] = useState<number>(5000); // mặc định 5s (5000ms)
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // States cho Music Selector (iTunes API miễn phí)
  const [showMusicModal, setShowMusicModal] = useState(false);
  const [musicSearchQuery, setMusicSearchQuery] = useState("");
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [searchingMusic, setSearchingMusic] = useState(false);
  const [selectedMusic, setSelectedMusic] = useState<SpotifyTrack | null>(null);
  
  // Preview audio state
  const [previewSound, setPreviewSound] = useState<Audio.Sound | null>(null);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);

  // Hàm map kết quả iTunes sang SpotifyTrack structure (tương thích)
  const mapITunesResults = (results: any[]): SpotifyTrack[] => {
    return (results || []).map((item: any) => ({
      id: String(item.trackId),
      name: item.trackName,
      artists: [{ name: item.artistName }],
      album: {
        images: [{ url: item.artworkUrl100 }],
        name: item.collectionName || "",
      },
      preview_url: item.previewUrl || null,
      uri: item.trackViewUrl || "",
    }));
  };

  // Load nhạc gợi ý mặc định (V-Pop) khi mở modal — giống web
  const fetchDefaultTracks = async () => {
    setSearchingMusic(true);
    try {
      const res = await fetch(
        `https://itunes.apple.com/search?term=V-Pop&media=music&limit=6`
      );
      const data = await res.json();
      setTracks(mapITunesResults(data.results));
    } catch (e) {
      console.error("Error loading default iTunes tracks:", e);
    } finally {
      setSearchingMusic(false);
    }
  };

  // Chọn ảnh/video từ thư viện
  const handlePickMedia = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Quyền truy cập", "Ứng dụng cần quyền truy cập thư viện để chọn ảnh/video.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const uri = asset.uri;
        const fileName = asset.fileName || uri.split("/").pop() || "story.jpg";
        const isVideo = asset.type === "video";
        const type = isVideo ? "video/mp4" : "image/jpeg";

        setFile({ uri, type, fileName });

        if (isVideo) {
          // Tính toán thời lượng video nếu có
          const vidDur = asset.duration ? asset.duration : 15000;
          setVideoDuration(vidDur / 1000);
          setDuration(Math.min(vidDur, 15000));
        } else {
          setVideoDuration(null);
          setDuration(5000); // 5s đối với ảnh
        }
      }
    } catch (error) {
      console.error("Lỗi khi chọn media:", error);
      Alert.alert("Lỗi", "Không thể mở thư viện ảnh.");
    }
  };

  const handleRemoveMedia = () => {
    setFile(null);
    setVideoDuration(null);
    setDuration(5000);
  };

  // Tìm kiếm nhạc trên iTunes (miễn phí, giống web)
  const handleSearchMusic = async () => {
    if (!musicSearchQuery.trim()) {
      fetchDefaultTracks();
      return;
    }
    setSearchingMusic(true);
    try {
      const res = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(musicSearchQuery)}&media=music&limit=10`
      );
      const data = await res.json();
      setTracks(mapITunesResults(data.results));
    } catch (error) {
      console.error("Lỗi khi tìm kiếm nhạc iTunes:", error);
      Alert.alert("Lỗi", "Có lỗi xảy ra khi tìm nhạc.");
    } finally {
      setSearchingMusic(false);
    }
  };

  // Phát thử nhạc
  const handlePlayPreview = async (track: SpotifyTrack) => {
    // Nếu đang phát bài này thì dừng lại
    if (playingTrackId === track.id && previewSound) {
      await previewSound.stopAsync();
      await previewSound.unloadAsync();
      setPreviewSound(null);
      setPlayingTrackId(null);
      return;
    }

    // Dừng bài đang phát trước đó
    if (previewSound) {
      await previewSound.stopAsync();
      await previewSound.unloadAsync();
      setPreviewSound(null);
    }

    if (!track.preview_url) {
      Alert.alert("Thông báo", "Bài hát này không hỗ trợ nghe thử.");
      return;
    }

    try {
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: track.preview_url },
        { shouldPlay: true }
      );
      setPreviewSound(newSound);
      setPlayingTrackId(track.id);

      // Theo dõi sự kiện kết thúc bài
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlayingTrackId(null);
        }
      });
    } catch (e) {
      console.warn("Lỗi phát thử nhạc:", e);
    }
  };

  // Dọn dẹp âm thanh khi tắt modal nhạc hoặc tắt screen
  const cleanupPreviewSound = async () => {
    if (previewSound) {
      try {
        await previewSound.stopAsync();
        await previewSound.unloadAsync();
      } catch (e) {}
      setPreviewSound(null);
      setPlayingTrackId(null);
    }
  };

  useEffect(() => {
    return () => {
      cleanupPreviewSound();
    };
  }, [previewSound]);

  const handleSelectTrack = (track: SpotifyTrack) => {
    setSelectedMusic(track);
    setShowMusicModal(false);
    cleanupPreviewSound();
  };

  const handleRemoveTrack = () => {
    setSelectedMusic(null);
  };

  // Tạo Story
  const handleCreateStory = async () => {
    if (!file) {
      Alert.alert("Lỗi", "Vui lòng chọn ảnh hoặc video để đăng Story.");
      return;
    }

    setLoading(true);
    try {
      const musicPayload = selectedMusic
        ? {
            title: selectedMusic.name,
            artist: selectedMusic.artists.map((a) => a.name).join(", "),
            url: selectedMusic.preview_url || "",
          }
        : undefined;

      const story = await postService.createStory(
        file,
        caption || undefined,
        privacy,
        musicPayload,
        duration
      );

      if (story) {
        Alert.alert("Thành công", "Đăng Story thành công!", [
          {
            text: "OK",
            onPress: () => {
              router.back();
            },
          },
        ]);
      } else {
        Alert.alert("Thất bại", "Không thể đăng Story. Vui lòng thử lại.");
      }
    } catch (error) {
      console.error("Lỗi đăng Story:", error);
      Alert.alert("Lỗi", "Có lỗi xảy ra khi tải lên Story.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "white", paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-100 bg-white">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back" size={24} color="#4b5563" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900">Tạo Story mới</Text>
        {loading ? (
          <ActivityIndicator size="small" color="#2563eb" className="px-2" />
        ) : (
          <TouchableOpacity
            onPress={handleCreateStory}
            disabled={!file}
            className={`bg-blue-600 px-4 py-1.5 rounded-full ${!file ? "opacity-40" : ""}`}
          >
            <Text className="text-white font-semibold text-sm">Đăng</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>
        {/* Quyền riêng tư */}
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ai có thể xem?</Text>
          <View className="bg-gray-50 border border-gray-100 rounded-full px-3 py-1">
            <Text className="text-xs font-semibold text-gray-700">
              {privacy === "PUBLIC" ? "🌍 Công khai" : privacy === "FRIENDS_ONLY" ? "👥 Bạn bè" : "🔒 Chỉ mình tôi"}
            </Text>
          </View>
        </View>

        {/* Khung Caption */}
        <TextInput
          placeholder="Thêm chú thích cho Story của bạn..."
          placeholderTextColor="#9ca3af"
          value={caption}
          onChangeText={setCaption}
          maxLength={100}
          className="bg-gray-50 border border-gray-100 focus:border-blue-500 rounded-2xl px-4 py-3 text-sm text-gray-800 mb-4"
        />

        {/* Music Selector Trigger */}
        {selectedMusic ? (
          <View className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-3">
              <Image source={{ uri: selectedMusic.album.images[0]?.url }} className="w-10 h-10 rounded-lg bg-gray-100" />
              <View style={{ maxWidth: "75%" }}>
                <Text className="text-xs font-bold text-blue-700 truncate">{selectedMusic.name}</Text>
                <Text className="text-[10px] text-blue-500 truncate">
                  {selectedMusic.artists.map((a) => a.name).join(", ")}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleRemoveTrack} className="p-1">
              <Ionicons name="trash-outline" size={18} color="#ef4444" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => setShowMusicModal(true)}
            className="border border-dashed border-gray-300 rounded-2xl p-4 flex-row items-center justify-center gap-2 mb-4 bg-gray-50/50"
          >
            <Ionicons name="musical-notes-outline" size={18} color="#2563eb" />
            <Text className="text-xs text-blue-600 font-semibold">Chọn nhạc nền miễn phí</Text>
          </TouchableOpacity>
        )}

        {/* Media Preview or Selector */}
        {file ? (
          <View className="relative h-96 w-full bg-black rounded-3xl overflow-hidden justify-center items-center shadow-inner border border-gray-100">
            <Image source={{ uri: file.uri }} className="w-full h-full object-contain" />
            {file.type.startsWith("video/") && (
              <View className="absolute bg-black/40 px-3 py-1.5 rounded-full flex-row items-center gap-1">
                <Ionicons name="videocam" size={14} color="white" />
                <Text className="text-white text-xs font-bold">Video</Text>
              </View>
            )}
            <TouchableOpacity
              onPress={handleRemoveMedia}
              className="absolute top-4 right-4 bg-black/60 p-2 rounded-full"
            >
              <Ionicons name="close" size={18} color="white" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={handlePickMedia}
            className="h-96 w-full bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl items-center justify-center gap-3"
          >
            <View className="w-12 h-12 rounded-full bg-blue-50 items-center justify-center">
              <Ionicons name="images" size={24} color="#2563eb" />
            </View>
            <View className="items-center">
              <Text className="text-sm font-bold text-gray-800">Chọn ảnh hoặc video cho Story</Text>
              <Text className="text-[10px] text-gray-400 mt-1">Hỗ trợ các định dạng JPEG, PNG, MP4 (Tối đa 50MB)</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Bộ chọn Thời gian */}
        {file && (
          <View className="mt-5 bg-gray-55/40 p-4 rounded-3xl border border-gray-100/50 mb-10">
            <Text className="text-xs font-bold text-blue-600 mb-2 flex-row items-center gap-1.5">
              <Ionicons name="time-outline" size={14} /> Thời gian hiển thị Story
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2 py-1">
              {[5000, 10000, 15000, 30000].map((val) => {
                const label = `${val / 1000} giây`;
                const isSelected = duration === val;
                const isDisabled = videoDuration !== null && val > videoDuration * 1000;

                return (
                  <TouchableOpacity
                    key={val}
                    disabled={isDisabled}
                    onPress={() => setDuration(val)}
                    className={`px-4 py-2 rounded-full border mr-2 ${
                      isSelected
                        ? "bg-blue-600 border-blue-600"
                        : isDisabled
                        ? "bg-gray-100 border-gray-100 opacity-40"
                        : "bg-white border-gray-200"
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-bold ${
                        isSelected ? "text-white" : isDisabled ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              {videoDuration !== null && (
                <TouchableOpacity
                  onPress={() => setDuration(videoDuration * 1000)}
                  className={`px-4 py-2 rounded-full border mr-2 ${
                    duration === videoDuration * 1000 ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"
                  }`}
                >
                  <Text
                    className={`text-[10px] font-bold ${
                      duration === videoDuration * 1000 ? "text-white" : "text-gray-600"
                    }`}
                  >
                    Độ dài video ({Math.round(videoDuration)}s)
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* Modal tìm nhạc miễn phí (iTunes API) */}
      <Modal visible={showMusicModal} animationType="slide" transparent={false}
        onShow={fetchDefaultTracks}
      >
        <View style={{ flex: 1, paddingTop: insets.top }}>
          {/* Header */}
          <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-100 bg-white">
            <TouchableOpacity
              onPress={() => {
                setShowMusicModal(false);
                cleanupPreviewSound();
              }}
              className="p-1"
            >
              <Ionicons name="close" size={26} color="#4b5563" />
            </TouchableOpacity>
            <Text className="text-lg font-bold text-gray-900">Thêm nhạc nền miễn phí</Text>
            <View className="w-8" />
          </View>

          {/* Search Input */}
          <View className="px-4 py-3 border-b border-gray-50 flex-row items-center gap-2">
            <Ionicons name="search" size={18} color="#9ca3af" />
            <TextInput
              placeholder="Nhập tên bài hát hoặc ca sĩ..."
              placeholderTextColor="#9ca3af"
              value={musicSearchQuery}
              onChangeText={setMusicSearchQuery}
              onSubmitEditing={handleSearchMusic}
              className="flex-1 bg-gray-50 rounded-full px-4 py-2 text-sm text-gray-800"
            />
            <TouchableOpacity onPress={handleSearchMusic} className="bg-blue-600 px-4 py-2 rounded-full">
              <Text className="text-white font-bold text-xs">Tìm</Text>
            </TouchableOpacity>
          </View>

          {searchingMusic ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator size="large" color="#2563eb" />
              <Text className="text-gray-400 text-sm mt-2">Đang tìm kiếm nhạc...</Text>
            </View>
          ) : (
            <FlatList
              data={tracks}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const isPlaying = playingTrackId === item.id;
                return (
                  <View className="flex-row items-center justify-between px-5 py-3 border-b border-gray-50">
                    <View className="flex-row items-center gap-3 flex-1">
                      <Image source={{ uri: item.album.images[0]?.url }} className="w-10 h-10 rounded bg-gray-100" />
                      <View style={{ maxWidth: "70%" }}>
                        <Text className="text-sm font-bold text-gray-800 truncate">{item.name}</Text>
                        <Text className="text-[10px] text-gray-400 truncate">
                          {item.artists.map((a) => a.name).join(", ")}
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row items-center gap-3">
                      {/* Bấm nghe thử */}
                      {item.preview_url ? (
                        <TouchableOpacity onPress={() => handlePlayPreview(item)} className="p-2">
                          <Ionicons
                            name={isPlaying ? "pause-circle" : "play-circle"}
                            size={26}
                            color="#2563eb"
                          />
                        </TouchableOpacity>
                      ) : null}

                      {/* Nút chọn */}
                      <TouchableOpacity
                        onPress={() => handleSelectTrack(item)}
                        className="bg-blue-50 border border-blue-100 px-3.5 py-1.5 rounded-full"
                      >
                        <Text className="text-blue-600 font-bold text-xs">Chọn</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }}
              ListEmptyComponent={
                <View className="items-center justify-center py-20 px-8">
                  <Ionicons name="musical-notes-outline" size={48} color="#d1d5db" />
                  <Text className="text-gray-400 text-sm mt-3 text-center">Gõ và tìm kiếm các bản nhạc bạn yêu thích!</Text>
                </View>
              }
            />
          )}
        </View>
      </Modal>
    </View>
  );
}
