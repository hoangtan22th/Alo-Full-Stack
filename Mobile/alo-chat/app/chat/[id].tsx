import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Keyboard,
} from "react-native";
import {
  ArrowLeftIcon,
  PhoneIcon,
  VideoCameraIcon,
  InformationCircleIcon,
  FaceSmileIcon,
  PlusIcon,
  CheckCircleIcon,
} from "react-native-heroicons/outline";
import { PaperAirplaneIcon } from "react-native-heroicons/solid";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Message {
  id: string;
  text: string;
  time: string;
  isSender: boolean;
  image?: string;
}

export default function GlobalChatScreen() {
  const { id, name, avatar, membersCount } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const [inputText, setInputText] = useState("");

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Chào buổi sáng! Bạn đã xem qua bản thiết kế mới cho HelvetiCore chưa?",
      time: "09:12",
      isSender: false,
    },
    {
      id: "2",
      text: "Tôi vừa xem xong. Những lớp tonal layering thực sự giúp giao diện có chiều sâu hơn hẳn. Rất ấn tượng!",
      time: "09:15",
      isSender: true,
    },
    {
      id: "3",
      image:
        "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop",
      text: 'Đúng vậy, tôi đang áp dụng quy tắc "No-Line" vào các component này.',
      time: "09:18",
      isSender: false,
    },
  ]);

  const sendMessage = () => {
    if (inputText.trim().length === 0) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
      isSender: true,
    };

    setMessages([...messages, newMessage]);
    setInputText("");
    Keyboard.dismiss();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#f9fafb" }} // bg-gray-50
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <View
        style={{ paddingTop: insets.top, backgroundColor: "white", zIndex: 10 }}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100 bg-white">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity
              onPress={() => router.back()}
              className="pr-4 py-2"
            >
              <ArrowLeftIcon size={24} color="#000" />
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center flex-1"
              activeOpacity={0.7}
              onPress={() => {
                if (membersCount) {
                  router.push({
                    pathname: "/chat/info",
                    params: {
                      id: id,
                      name: name,
                      avatar: avatar,
                      membersCount: membersCount,
                    },
                  });
                } else {
                  router.push({
                    pathname: "/contacts/send-request",
                    params: {
                      userId: id,
                      fullName: name,
                      avatarUrl: avatar,
                      relationStatus: "ACCEPTED",
                      from: "chat",
                      chatId: id,
                      chatName: name,
                      chatAvatar: avatar,
                    },
                  });
                }
              }}
            >
              <View className="relative">
                {avatar ? (
                  <Image
                    source={{ uri: avatar as string }}
                    className="w-11 h-11 rounded-full"
                  />
                ) : (
                  <View className="w-11 h-11 rounded-full bg-gray-900 items-center justify-center">
                    <Text className="text-white font-bold text-lg">
                      {((name as string) || "G").charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                {/* Hiện chấm xanh nếu là cá nhân không có membersCount */}
                {!membersCount && (
                  <View className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />
                )}
              </View>

              <View className="ml-3 flex-1 pr-2">
                <Text
                  className="text-base font-bold text-gray-900"
                  numberOfLines={1}
                >
                  {name || `Nhóm ${id}`}
                </Text>
                <Text className="text-xs text-gray-500 mt-0.5">
                  {membersCount
                    ? `${membersCount} thành viên`
                    : "Đang hoạt động"}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <View className="flex-row items-center gap-5">
            <TouchableOpacity>
              <PhoneIcon size={24} color="#374151" />
            </TouchableOpacity>
            <TouchableOpacity>
              <VideoCameraIcon size={24} color="#374151" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                router.push({
                  pathname: "/chat/info",
                  params: {
                    id: id,
                    name: name,
                    avatar: avatar,
                    membersCount: membersCount,
                  },
                });
              }}
            >
              <InformationCircleIcon size={24} color="#374151" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Body Messages */}
      <ScrollView
        ref={scrollViewRef}
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
        onContentSizeChange={() =>
          scrollViewRef.current?.scrollToEnd({ animated: true })
        }
      >
        <Text className="text-center text-xs text-gray-400 font-bold my-6 tracking-widest uppercase">
          THỨ HAI, 14 THÁNG 10
        </Text>

        {messages.map((msg) => (
          <View
            key={msg.id}
            className={`mb-6 max-w-[80%] ${msg.isSender ? "self-end" : "self-start"}`}
          >
            <View
              className={`px-5 py-4 shadow-sm ${
                msg.isSender
                  ? "bg-black rounded-3xl rounded-br-lg"
                  : "bg-white rounded-3xl rounded-bl-lg"
              }`}
            >
              {msg.image && (
                <Image
                  source={{ uri: msg.image }}
                  className="w-64 h-48 rounded-2xl mb-4 self-center"
                  resizeMode="cover"
                />
              )}
              {msg.text ? (
                <Text
                  className={`text-base leading-6 ${
                    msg.isSender ? "text-white" : "text-gray-900"
                  }`}
                >
                  {msg.text}
                </Text>
              ) : null}
            </View>

            {/* Time & Status */}
            <View
              className={`flex-row items-center mt-2 ${msg.isSender ? "justify-end pr-2" : "justify-start pl-2"}`}
            >
              <Text className="text-xs text-gray-500">{msg.time}</Text>
              {msg.isSender && (
                <View className="ml-1">
                  <CheckCircleIcon size={14} color="#000" />
                </View>
              )}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Bottom Input Area */}
      <View
        className="flex-row items-end px-4 py-3 bg-[#f9fafb]"
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}
      >
        {/* Input box */}
        <View className="flex-1 flex-row items-center bg-white rounded-full pl-2 pr-4 py-1.5 shadow-sm border border-gray-200 min-h-[50px]">
          <TouchableOpacity className="p-2">
            <PlusIcon size={24} color="#6b7280" />
          </TouchableOpacity>
          <TextInput
            className="flex-1 mx-2 text-base max-h-24 pt-2 pb-2"
            placeholder="Nhập tin nhắn..."
            placeholderTextColor="#9ca3af"
            multiline
            value={inputText}
            onChangeText={setInputText}
          />
          <TouchableOpacity className="p-2">
            <FaceSmileIcon size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {/* Send Button */}
        <TouchableOpacity
          onPress={sendMessage}
          className="ml-3 w-[50px] h-[50px] bg-black rounded-full items-center justify-center shadow-md pb-0.5 pr-0.5"
        >
          <PaperAirplaneIcon size={22} color="white" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
