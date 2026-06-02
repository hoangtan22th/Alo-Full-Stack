import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  TouchableWithoutFeedback,
  Dimensions,
} from "react-native";
import { XMarkIcon } from "react-native-heroicons/outline";

// Một số sticker mẫu
const SAMPLE_STICKERS = [
  "https://img.icons8.com/fluent/96/000000/smiling.png",
  "https://img.icons8.com/fluent/96/000000/in-love.png",
  "https://img.icons8.com/fluent/96/000000/kiss.png",
  "https://img.icons8.com/fluent/96/000000/wink.png",
  "https://img.icons8.com/fluent/96/000000/laughing.png",
  "https://img.icons8.com/fluent/96/000000/tongue-out.png",
  "https://img.icons8.com/fluent/96/000000/surprised.png",
  "https://img.icons8.com/fluent/96/000000/confused.png",
  "https://img.icons8.com/fluent/96/000000/sad.png",
  "https://img.icons8.com/fluent/96/000000/crying.png",
  "https://img.icons8.com/fluent/96/000000/angry.png",
  "https://img.icons8.com/fluent/96/000000/sleeping.png",
];

interface StickerPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectSticker: (url: string) => void;
}

export const StickerPickerModal = ({
  visible,
  onClose,
  onSelectSticker,
}: StickerPickerModalProps) => {
  const windowHeight = Dimensions.get("window").height;

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 justify-end bg-black/40">
          <TouchableWithoutFeedback>
            <View 
              className="bg-white rounded-t-3xl overflow-hidden"
              style={{ height: windowHeight * 0.4 }}
            >
              <View className="flex-row items-center justify-between px-5 py-3 border-b border-gray-100">
                <Text className="text-[17px] font-bold text-gray-900">Chọn Sticker</Text>
                <TouchableOpacity onPress={onClose} className="p-2 -mr-2">
                  <XMarkIcon size={24} color="#9ca3af" />
                </TouchableOpacity>
              </View>

              <FlatList
                data={SAMPLE_STICKERS}
                keyExtractor={(item, index) => index.toString()}
                numColumns={4}
                className="flex-1 px-2 pt-2"
                renderItem={({ item }) => (
                  <TouchableOpacity
                    className="flex-1 aspect-square p-2 m-1 items-center justify-center bg-gray-50 rounded-2xl"
                    onPress={() => {
                      onSelectSticker(item);
                      onClose();
                    }}
                  >
                    <Image source={{ uri: item }} className="w-16 h-16" resizeMode="contain" />
                  </TouchableOpacity>
                )}
              />
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};
