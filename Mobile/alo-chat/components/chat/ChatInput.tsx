import React, { useState } from "react";
import {
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  DocumentIcon,
  FaceSmileIcon,
  MicrophoneIcon,
  PhotoIcon,
  PlusIcon,
} from "react-native-heroicons/outline";
import { PaperAirplaneIcon } from "react-native-heroicons/solid";
import Animated, {
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ChatInputProps {
  inputText: string;
  onInputChange: (text: string) => void;
  onSendMessage: () => void;
  onSendImage: () => void;
  onSendFile: () => void;
  isKeyboardVisible: boolean;
}

export const ChatInput = ({
  inputText,
  onInputChange,
  onSendMessage,
  onSendImage,
  onSendFile,
  isKeyboardVisible,
}: ChatInputProps) => {
  const insets = useSafeAreaInsets();
  const [showExtensionMenu, setShowExtensionMenu] = useState(false);

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
            className="flex-row items-center px-4 py-3"
            onPress={() => {
              setShowExtensionMenu(false);
              /* Logic gửi icon sau */
            }}
          >
            <FaceSmileIcon size={22} color="#f59e0b" />
            <Text className="ml-3 font-medium text-gray-700">Gửi icon</Text>
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
};

// Internal Text component for the menu
const Text = ({ children, className }: { children: any; className?: string }) => {
  const { Text: RNText } = require("react-native");
  return <RNText className={className}>{children}</RNText>;
};
