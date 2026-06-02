import React, { forwardRef, useImperativeHandle, useRef, useState, useEffect } from "react";
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
  IdentificationIcon,
} from "react-native-heroicons/outline";
import { PaperAirplaneIcon } from "react-native-heroicons/solid";
import Animated, {
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { Audio } from "expo-av";
import { getMessageTextContent } from "../../utils/messageUtils";
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
  onSendContact?: () => void;
  onOpenSticker?: () => void;
  isKeyboardVisible: boolean;
  replyingTo?: MessageDTO | null;
  onCancelReply?: () => void;
  canSendMessage?: boolean;
  isBanned?: boolean;
  onSelectionChange?: (e: any) => void;
  onSendAudio?: (uri: string, durationMillis: number) => void;
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
      onSendContact,
      onOpenSticker,
      isKeyboardVisible,
      replyingTo,
      onCancelReply,
      canSendMessage = true,
      isBanned = false,
      onSelectionChange,
      onSendAudio,
    },
    ref,
  ) => {
    const insets = useSafeAreaInsets();
    const [showExtensionMenu, setShowExtensionMenu] = useState(false);
    const textInputRef = useRef<TextInput>(null);

    // Audio states
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const recordingInterval = useRef<any>(null);

    useEffect(() => {
      return () => {
        if (recordingInterval.current) clearInterval(recordingInterval.current);
        if (recording) {
          recording.stopAndUnloadAsync().catch(() => {});
        }
      };
    }, []);

    const startRecording = async () => {
      try {
        const permission = await Audio.requestPermissionsAsync();
        if (permission.status !== "granted") return;
        
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        const { recording: newRecording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        
        setRecording(newRecording);
        setIsRecording(true);
        setRecordingTime(0);

        recordingInterval.current = setInterval(() => {
          setRecordingTime((prev) => prev + 1);
        }, 1000);
      } catch (err) {
        console.error("Failed to start recording", err);
      }
    };

    const stopRecordingAndSend = async () => {
      if (!recording) return;
      setIsRecording(false);
      if (recordingInterval.current) clearInterval(recordingInterval.current);

      try {
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        const status = await recording.getStatusAsync();
        if (uri && onSendAudio) {
          onSendAudio(uri, status.durationMillis || recordingTime * 1000);
        }
      } catch (err) {
        console.error("Failed to stop recording", err);
      }
      setRecording(null);
    };

    const cancelRecording = async () => {
      if (!recording) return;
      setIsRecording(false);
      if (recordingInterval.current) clearInterval(recordingInterval.current);

      try {
        await recording.stopAndUnloadAsync();
      } catch (err) {}
      setRecording(null);
    };

    const formatDuration = (seconds: number) => {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

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
            className={`flex-row items-center px-4 py-3 border-b border-gray-50 ${(!canSendMessage || isBanned) ? "opacity-40" : ""}`}
            disabled={!canSendMessage || isBanned}
            onPress={() => {
              setShowExtensionMenu(false);
              onSendImage();
            }}
          >
            <PhotoIcon size={22} color={(canSendMessage && !isBanned) ? "#10b981" : "#9ca3af"} />
            <Text className="ml-3 font-medium text-gray-700">Gửi ảnh</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-row items-center px-4 py-3 border-b border-gray-50 ${(!canSendMessage || isBanned) ? "opacity-40" : ""}`}
            disabled={!canSendMessage || isBanned}
            onPress={() => {
              setShowExtensionMenu(false);
              onSendFile();
            }}
          >
            <DocumentIcon size={22} color={(canSendMessage && !isBanned) ? "#3b82f6" : "#9ca3af"} />
            <Text className="ml-3 font-medium text-gray-700">Gửi tệp/File</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-row items-center px-4 py-3 border-b border-gray-50 ${(!canSendMessage || isBanned) ? "opacity-40" : ""}`}
            disabled={!canSendMessage || isBanned}
            onPress={() => {
              setShowExtensionMenu(false);
              /* Logic gửi icon sau */
            }}
          >
            <FaceSmileIcon size={22} color={(canSendMessage && !isBanned) ? "#f59e0b" : "#9ca3af"} />
            <Text className="ml-3 font-medium text-gray-700">Gửi icon</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-row items-center px-4 py-3 ${isBanned ? "opacity-40" : ""}`}
            disabled={isBanned}
            onPress={() => {
              setShowExtensionMenu(false);
              if (onCreatePoll) onCreatePoll();
            }}
          >
            <ChartBarIcon size={22} color={!isBanned ? "#8b5cf6" : "#9ca3af"} />
            <Text className="ml-3 font-medium text-gray-700">Tạo bình chọn</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-row items-center px-4 py-3 border-t border-gray-50 ${isBanned ? "opacity-40" : ""}`}
            disabled={isBanned}
            onPress={() => {
              setShowExtensionMenu(false);
              if (onSendContact) onSendContact();
            }}
          >
            <IdentificationIcon size={22} color={!isBanned ? "#ef4444" : "#9ca3af"} />
            <Text className="ml-3 font-medium text-gray-700">Gửi danh thiếp</Text>
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
                ? getMessageTextContent(replyingTo.content)
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
          paddingBottom: Math.max(insets.bottom, 12),
        }}
      >
        <TouchableOpacity
          onPress={() => setShowExtensionMenu(!showExtensionMenu)}
          disabled={isBanned}
          className={`mr-3 w-[46px] h-[46px] bg-white rounded-full items-center justify-center shadow-sm border border-gray-100 mb-0.5 active:bg-gray-50 ${isBanned ? "opacity-40" : ""}`}
        >
          <Animated.View style={spinMenu}>
            <PlusIcon size={24} color={!isBanned ? "#374151" : "#9ca3af"} />
          </Animated.View>
        </TouchableOpacity>

        <View className="flex-1 flex-row items-end bg-white rounded-[25px] pl-4 pr-1.5 py-1.5 shadow-sm border border-gray-200 min-h-[50px]">
          {isRecording ? (
            <View className="flex-1 flex-row items-center justify-between min-h-[36px] max-h-24 py-1">
              <TouchableOpacity onPress={cancelRecording} className="p-2 ml-1">
                <XMarkIcon size={22} color="#ef4444" />
              </TouchableOpacity>
              <View className="flex-1 items-center flex-row justify-center">
                 <View className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse mr-2" />
                 <Text className="text-red-500 font-bold">{formatDuration(recordingTime)}</Text>
              </View>
            </View>
          ) : (
            <>
              <TextInput
                ref={textInputRef}
                className={`flex-1 text-[15px] text-gray-800 max-h-24 pt-2 pb-2 mt-0.5 mb-0.5 ${(!canSendMessage || isBanned) ? "text-gray-400" : ""}`}
                placeholder={isBanned ? "Nhóm bị khóa do vi phạm" : canSendMessage ? "Nhập tin nhắn..." : "Chỉ trưởng/phó nhóm mới được nhắn"}
                placeholderTextColor="#9ca3af"
                multiline
                value={inputText}
                onChangeText={onInputChange}
                onSelectionChange={onSelectionChange}
                editable={canSendMessage && !isBanned}
              />
              <TouchableOpacity
                onPress={() => (onOpenSticker && onOpenSticker())}
                disabled={isBanned}
                className={`w-[36px] h-[36px] rounded-full items-center justify-center mr-1 ${isBanned ? "opacity-40" : ""}`}
              >
                <FaceSmileIcon size={24} color={!isBanned ? "#9ca3af" : "#d1d5db"} />
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity
            onPress={() => {
              if (isRecording) {
                 stopRecordingAndSend();
              } else if (inputText.trim() && canSendMessage && !isBanned) {
                 onSendMessage();
              } else if (!inputText.trim() && canSendMessage && !isBanned) {
                 startRecording();
              }
            }}
            disabled={(!canSendMessage && !inputText.trim() && !isRecording) || isBanned}
            className={`w-[36px] h-[36px] rounded-full items-center justify-center ${
              (inputText.trim() || isRecording) && canSendMessage && !isBanned ? "bg-black" : "bg-gray-100"
            }`}
          >
            {(inputText.trim() || isRecording) ? (
              <PaperAirplaneIcon
                size={20}
                color="white"
                style={{
                  transform: [{ translateX: 1 }, { translateY: 1 }],
                }}
              />
            ) : (
              <MicrophoneIcon size={20} color={!isBanned ? "#374151" : "#9ca3af"} />
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
