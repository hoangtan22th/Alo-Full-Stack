import { useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import {
  CameraIcon,
  MagnifyingGlassIcon,
} from "react-native-heroicons/outline";
import { CheckIcon, PlusIcon } from "react-native-heroicons/solid";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import {
  contactService,
  FriendshipResponseDTO,
} from "../../services/contactService";
import { groupService } from "../../services/groupService";
import { useAuth } from "../../contexts/AuthContext";

type Contact = {
  id: string;
  name: string;
  status: string;
  avatar: string | null;
  initials?: string;
};

type ContactSection = {
  title: string;
  data: Contact[];
};

export default function CreateGroupScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [friends, setFriends] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [groupAvatarUri, setGroupAvatarUri] = useState<string | null>(null);

  useEffect(() => {
    fetchFriends();
  }, []);

  const handlePickImage = async () => {
    // Xin quyền truy cập thư viện ảnh nếu cần (trên iOS/Android thật)
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert(
        "Quyền truy cập",
        "Bạn cần cấp quyền truy cập ảnh để chọn ảnh đại diện nhóm!",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1], // Crop hình vuông
      quality: 0.8,
    });

    if (!result.canceled) {
      setGroupAvatarUri(result.assets[0].uri);
    }
  };

  const fetchFriends = async () => {
    try {
      const data = await contactService.getFriendsList();
      const formattedFriends = data.map((f) => {
        const isRequester = f.requesterId === user?.id;
        const friendId = isRequester ? f.recipientId : f.requesterId;
        const friendName = isRequester ? f.recipientName : f.requesterName;
        const friendAvatar = isRequester
          ? f.recipientAvatar
          : f.requesterAvatar;

        return {
          id: friendId,
          name: friendName || "Người dùng",
          status: "Bạn bè",
          avatar: friendAvatar || null,
          initials: friendName ? friendName.charAt(0).toUpperCase() : "U",
        };
      });
      setFriends(formattedFriends);
    } catch (error) {
      console.error("Lỗi tải bạn bè:", error);
    }
  };

  const CONTACT_SECTIONS: ContactSection[] = [
    {
      title: "BẠN BÈ",
      data: friends,
    },
  ];

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tên nhóm");
      return;
    }
    if (selectedContacts.length < 2) {
      Alert.alert("Lỗi", "Nhóm phải có ít nhất 3 thành viên (bao gồm bạn)");
      return;
    }

    try {
      setIsLoading(true);
      const result = await groupService.createGroup(
        groupName.trim(),
        selectedContacts,
        groupAvatarUri || undefined,
      );

      // Backend trả về group object có _id hoặc id
      const newGroup = result?.data?.data ? result.data.data : result?.data ? result.data : result;
      const newGroupId = newGroup?._id || newGroup?.id;

      if (newGroupId) {
        // Chuyển thẳng sang màn hình chat, dùng replace để giải phóng màn hình tạo nhóm khỏi stack
        router.replace({
          pathname: "/chat/[id]",
          params: {
            id: newGroupId,
            name: groupName.trim(),
            isGroup: "true",
            avatar: groupAvatarUri || "",
            membersCount: (selectedContacts.length + 1).toString(),
          },
        } as any);
      } else {
        // Fallback nếu không lấy được ID
        Alert.alert("Thành công", "Tạo nhóm thành công!", [
          { text: "OK", onPress: () => router.back() },
        ]);
      }
    } catch (error) {
      console.error("Lỗi tạo nhóm:", error);
      Alert.alert("Lỗi", "Đã xảy ra lỗi khi tạo nhóm");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleContact = (id: string) => {
    if (selectedContacts.includes(id)) {
      setSelectedContacts(
        selectedContacts.filter((contactId) => contactId !== id),
      );
    } else {
      setSelectedContacts([...selectedContacts, id]);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "white", paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-50">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-base text-gray-500">Trở về</Text>
        </TouchableOpacity>
        <Text className="text-base font-bold text-gray-900">Tạo nhóm mới</Text>
        <TouchableOpacity onPress={handleCreateGroup} disabled={isLoading}>
          <Text
            className={`text-base font-bold ${isLoading ? "text-gray-400" : "text-gray-900"}`}
          >
            Tạo
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        <View className="items-center mt-8 mb-6">
          <TouchableOpacity
            onPress={handlePickImage}
            className="w-24 h-24 bg-gray-100 rounded-full items-center justify-center relative overflow-hidden border-2 border-gray-200"
          >
            {groupAvatarUri ? (
              <Image
                source={{ uri: groupAvatarUri }}
                className="w-full h-full"
                resizeMode="cover"
              />
            ) : (
              <CameraIcon size={32} color="#9ca3af" />
            )}
            <View className="absolute bottom-0 right-0 bg-black w-7 h-7 rounded-full items-center justify-center border-[3px] border-white z-10">
              <PlusIcon size={14} color="white" />
            </View>
          </TouchableOpacity>
        </View>

        <View className="items-center px-12 mb-8">
          <TextInput
            placeholder="Tên nhóm"
            placeholderTextColor="#d1d5db"
            value={groupName}
            onChangeText={setGroupName}
            className="text-2xl text-center text-gray-900 w-full pb-2"
          />
          <View className="w-3/5 h-[1px] bg-gray-100" />
        </View>

        <View className="flex-row items-center bg-gray-50 rounded-2xl px-4 py-3 mx-4 mb-6">
          <MagnifyingGlassIcon size={20} color="#9ca3af" />
          <TextInput
            placeholder="Tìm kiếm thành viên"
            placeholderTextColor="#9ca3af"
            className="flex-1 ml-2 text-base text-gray-800"
          />
        </View>

        {CONTACT_SECTIONS.map((section, sectionIndex) => (
          <View key={sectionIndex} className="mb-4">
            <Text className="text-[11px] font-bold text-gray-500 tracking-widest px-5 mb-4">
              {section.title}
            </Text>
            {section.data.map((contact) => {
              const isSelected = selectedContacts.includes(contact.id);
              return (
                <TouchableOpacity
                  key={contact.id}
                  activeOpacity={0.7}
                  onPress={() => toggleContact(contact.id)}
                  className="flex-row items-center px-5 mb-5"
                >
                  {contact.avatar ? (
                    <Image
                      source={{ uri: contact.avatar }}
                      className="w-14 h-14 rounded-full"
                    />
                  ) : (
                    <View className="w-14 h-14 rounded-full bg-gray-100 items-center justify-center">
                      <Text className="text-gray-500 font-bold text-xl">
                        {contact.initials}
                      </Text>
                    </View>
                  )}
                  <View className="flex-1 ml-4 justify-center">
                    <Text className="text-base font-bold text-gray-900 mb-0.5">
                      {contact.name}
                    </Text>
                    <Text className="text-sm text-gray-400">
                      {contact.status}
                    </Text>
                  </View>
                  <View
                    className={`w-6 h-6 rounded-full items-center justify-center ${isSelected ? "bg-black" : "border border-gray-300 bg-transparent"}`}
                  >
                    {isSelected && <CheckIcon size={14} color="white" />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {/* Lớp đệm lớn ở cuối để không bị che bởi Bottom Tabs */}
        <View className="h-32" />
      </ScrollView>
    </View>
  );
}
