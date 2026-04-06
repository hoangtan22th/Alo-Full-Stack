import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Alert,
  RefreshControl,
} from "react-native";
import { ArrowLeftIcon } from "react-native-heroicons/solid";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import api from "../../../services/api";

export default function EditProfileScreen() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets(); // Lấy chiều cao vùng an toàn (tai thỏ/status bar)

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, []),
  );

  const fetchProfile = async () => {
    try {
      const res = await api.get("/auth/me");
      setUser(res.data);
    } catch (err) {
      console.log("Lỗi tải profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProfile();
    setRefreshing(false);
  }, []);

  const uploadImage = async (uri: string, isAvatar: boolean) => {
    try {
      setLoading(true);
      const formData = new FormData();
      const filename = uri.split("/").pop() || "image.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      // @ts-ignore: FormData in React Native appends support these fields
      formData.append("file", { uri, name: filename, type });

      const endpoint = isAvatar ? "/auth/me/avatar" : "/auth/me/cover";
      const res = await api.post(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUser(res.data);
      Alert.alert(
        "Thành công",
        `Cập nhật ${isAvatar ? "ảnh đại diện" : "ảnh bìa"} thành công!`,
      );
    } catch (err) {
      console.log("Lỗi tải ảnh:", err);
      Alert.alert("Lỗi", "Không thể tải ảnh lên. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async (isAvatar: boolean) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Cấp quyền",
        "Rất tiếc, chúng tôi cần quyền truy cập thư viện ảnh để thao tác.",
      );
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, // Chỉnh theo expo-image-picker mới nhất
      allowsEditing: true,
      aspect: isAvatar ? [1, 1] : [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      await uploadImage(result.assets[0].uri, isAvatar);
    }
  };

  if (loading)
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#000" />
      </View>
    );

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View
        className="flex-row justify-between items-center px-4 pb-4 bg-white"
        style={{ paddingTop: insets.top + 10 }} // Tự động đẩy xuống khỏi tai thỏ
      >
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeftIcon size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-black">Profile</Text>
        <TouchableOpacity>
          <Ionicons name="ellipsis-vertical" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 50 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#000"]}
            tintColor="#000"
          />
        }
      >
        {/* Banner & Avatar Wrapper */}
        <View className="items-center">
          {/* Cover Image */}
          <View className="w-full h-[200px] relative">
            <Image
              source={{
                uri:
                  user?.coverImage ||
                  "https://images.unsplash.com/photo-1557683316-973673baf926",
              }}
              className="w-full h-full bg-[#111]"
            />
            {/* Nút Camera cho ảnh bìa */}
            <TouchableOpacity
              className="absolute bottom-3 right-3 bg-[#e4e6eb] w-9 h-9 rounded-full justify-center items-center"
              onPress={() => pickImage(false)}
            >
              <Feather name="camera" size={18} color="#000" />
            </TouchableOpacity>
          </View>

          {/* Avatar (Kéo lên đè vào ảnh bìa nhờ -mt-[65px]) */}
          <View className="-mt-[65px] w-[130px] h-[130px] rounded-full border-4 border-white bg-white relative">
            <Image
              source={{
                uri:
                  user?.avatar ||
                  `https://api.dicebear.com/7.x/avataaars/png?seed=${user?.email || "Felix"}`,
              }}
              className="w-full h-full rounded-full"
            />
            {/* Nút Camera cho Avatar */}
            <TouchableOpacity
              className="absolute bottom-0 right-0 bg-[#e4e6eb] w-8 h-8 rounded-full justify-center items-center border-[3px] border-white"
              onPress={() => pickImage(true)}
            >
              <Feather name="camera" size={14} color="#000" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Thông tin User */}
        <View className="items-center mt-4 px-5">
          <Text className="text-2xl font-bold text-black text-center">
            {user?.fullName || "Nguyễn Hoàng Tấn"}
          </Text>
          <Text className="text-[15px] text-[#65676b] mt-1.5 text-center">
            Học hỏi là việc cả đời
          </Text>
        </View>

        {/* Nút Chỉnh sửa trang cá nhân */}
        <View className="mt-6 px-4">
          <TouchableOpacity
            className="bg-[#050505] flex-row h-[50px] rounded-full justify-center items-center w-full"
            onPress={() => router.push("/profile/account-security")}
          >
            <Feather
              name="edit-2"
              size={16}
              color="#fff"
              style={{ marginRight: 8 }}
            />
            <Text className="text-white text-[15px] font-semibold">
              Chỉnh sửa thông tin cá nhân
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
