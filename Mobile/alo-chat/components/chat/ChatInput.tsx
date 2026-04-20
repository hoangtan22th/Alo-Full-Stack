import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import {
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ArrowUturnLeftIcon,
  DocumentIcon,
  FaceSmileIcon,
  MicrophoneIcon,
  PhotoIcon,
  PlusIcon,
  ChartBarIcon,
  XMarkIcon,
} from "react-native-heroicons/outline";
import { PaperAirplaneIcon } from "react-native-heroicons/solid";
import Animated, {
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MessageDTO } from "../../services/messageService";

export interface ChatInputHandle {
  focus: () => void;
  blur: () => void;
}

interface ChatInputProps {
  inputText: string;
  onInputChange: (text: string) => void;
  onSendMessage: () => void;
  onSendImage: () => void;
  onSendFile: () => void;
  onCreatePoll?: () => void;
  isKeyboardVisible: boolean;
  replyingTo?: MessageDTO | null;
  onCancelReply?: () => void;
}

export const ChatInput = forwardRef<ChatInputHandle, ChatInputProps>(
  (
    {
      inputText,
      onInputChange,
      onSendMessage,
      onSendImage,
      onSendFile,
      onCreatePoll,
      isKeyboardVisible,
      replyingTo,
      onCancelReply,
    },
    ref,
  ) => {
    const insets = useSafeAreaInsets();
    const [showExtensionMenu, setShowExtensionMenu] = useState(false);
    const textInputRef = useRef<TextInput>(null);

    useImperativeHandle(ref, () => ({
      focus: () => textInputRef.current?.focus(),
      blur: () => textInputRef.current?.blur(),
    }));

  const spinMenu = useAnimatedStyle(() => {
    return {
      transform: [
        {
          rotate: withTiming(showExtensionMenu ? "45deg" : "0deg", {
            duration: 250,
          }),
        },
      ],
    };
  });

  return (
    <>
      {/* Extension Menu */}
      {showExtensionMenu && (
        <View className="absolute bottom-28 left-4 bg-white rounded-2xl shadow-xl w-48 border border-gray-100 overflow-hidden py-1 z-50">
          <TouchableOpacity
            className="flex-row items-center px-4 py-3 border-b border-gray-50"
            onPress={() => {
              setShowExtensionMenu(false);
              onSendImage();
            }}
          >
            <PhotoIcon size={22} color="#10b981" />
            <Text className="ml-3 font-medium text-gray-700">Gửi ảnh</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-row items-center px-4 py-3 border-b border-gray-50"
            onPress={() => {
              setShowExtensionMenu(false);
              onSendFile();
            }}
          >
            <DocumentIcon size={22} color="#3b82f6" />
            <Text className="ml-3 font-medium text-gray-700">Gửi tệp/File</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-row items-center px-4 py-3 border-b border-gray-50"
            onPress={() => {
              setShowExtensionMenu(false);
              /* Logic gửi icon sau */
            }}
          >
            <FaceSmileIcon size={22} color="#f59e0b" />
            <Text className="ml-3 font-medium text-gray-700">Gửi icon</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-row items-center px-4 py-3"
            onPress={() => {
              setShowExtensionMenu(false);
              if (onCreatePoll) onCreatePoll();
            }}
          >
            <ChartBarIcon size={22} color="#8b5cf6" />
            <Text className="ml-3 font-medium text-gray-700">Tạo bình chọn</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Reply Preview */}
      {replyingTo && (
        <View className="px-5 py-2.5 bg-gray-50/90 border-t border-gray-100 flex-row items-center">
          <View className="flex-1 border-l-2 border-blue-500 pl-3 py-0.5">
            <View className="flex-row items-center mb-1">
              <ArrowUturnLeftIcon
                size={12}
                color="#3b82f6"
                style={{ transform: [{ scaleX: -1 }], marginRight: 6 }}
              />
              <Text className="text-[11px] font-bold text-blue-600 uppercase tracking-tight">
                Trả lời {replyingTo.senderName || "người dùng"}
              </Text>
            </View>
            <Text className="text-[13px] text-gray-500 italic" numberOfLines={1}>
              {replyingTo.type === "text"
                ? replyingTo.content
                : replyingTo.type === "image"
                  ? "[Hình ảnh]"
                  : replyingTo.metadata?.fileName || "[Tệp tin]"}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onCancelReply}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            className="w-5 h-5 items-center justify-center bg-gray-200 rounded-full ml-3"
          >
            <XMarkIcon size={12} color="#6b7280" />
          </TouchableOpacity>
        </View>
      )}

      {/* Input Area */}
      <View
        className="w-full flex-row items-end px-4 py-3 bg-transparent"
        style={{
          paddingBottom: isKeyboardVisible
            ? 12
            : Math.max(insets.bottom, 12),
        }}
      >
        <TouchableOpacity
          onPress={() => setShowExtensionMenu(!showExtensionMenu)}
          className="mr-3 w-[46px] h-[46px] bg-white rounded-full items-center justify-center shadow-sm border border-gray-100 mb-0.5 active:bg-gray-50"
        >
          <Animated.View style={spinMenu}>
            <PlusIcon size={24} color="#374151" />
          </Animated.View>
        </TouchableOpacity>

        <View className="flex-1 flex-row items-end bg-white rounded-[25px] pl-4 pr-1.5 py-1.5 shadow-sm border border-gray-200 min-h-[50px]">
          <TextInput
            ref={textInputRef}
            className="flex-1 text-[15px] text-gray-800 max-h-24 pt-2 pb-2 mt-0.5 mb-0.5"
            placeholder="Nhập tin nhắn..."
            placeholderTextColor="#9ca3af"
            multiline
            value={inputText}
            onChangeText={onInputChange}
          />
          <TouchableOpacity
            onPress={() => (inputText.trim() ? onSendMessage() : null)}
            className={`w-[36px] h-[36px] rounded-full items-center justify-center ml-2 ${
              inputText.trim() ? "bg-black" : "bg-gray-100"
            }`}
          >
            {inputText.trim() ? (
              <PaperAirplaneIcon
                size={20}
                color="white"
                style={{
                  transform: [{ translateX: 1 }, { translateY: 1 }],
                }}
              />
            ) : (
              <MicrophoneIcon size={20} color="#374151" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
});

// Internal Text component for the menu
const Text = ({
  children,
  className,
  numberOfLines,
}: {
  children: any;
  className?: string;
  numberOfLines?: number;
}) => {
  const { Text: RNText } = require("react-native");
  return (
    <RNText className={className} numberOfLines={numberOfLines}>
      {children}
    </RNText>
  );
};
