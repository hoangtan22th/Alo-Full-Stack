import React, { useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  Platform,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BellIcon, XMarkIcon } from "react-native-heroicons/solid";
import { Image } from "expo-image";

const { width } = Dimensions.get("window");

interface InAppNotificationProps {
  visible: boolean;
  onHide: () => void;
  onPress?: () => void;
  title: string;
  message: string;
  avatar?: string;
  duration?: number;
}

const InAppNotification: React.FC<InAppNotificationProps> = ({
  visible,
  onHide,
  onPress,
  title,
  message,
  avatar,
  duration = 5000,
}) => {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-200);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(insets.top + 10, {
        damping: 15,
        stiffness: 100,
      });

      const timer = setTimeout(() => {
        hide();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      hide();
    }
  }, [visible, insets.top]);

  const hide = () => {
    translateY.value = withTiming(-200, { duration: 300 }, () => {
      runOnJS(onHide)();
    });
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  if (!visible && translateY.value === -200) return null;

  return (
    <Animated.View
      style={[styles.container, animatedStyle]}
      className="absolute left-4 right-4 z-[9999]"
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => {
          onPress?.();
          hide();
        }}
        className="bg-white/95 items-center flex-row p-4 rounded-3xl shadow-2xl border border-gray-100"
        style={styles.shadow}
      >
        <View className="relative">
          {avatar ? (
            <Image
              source={{ uri: avatar }}
              style={{ width: 48, height: 48 }}
              className="rounded-2xl"
              contentFit="cover"
            />
          ) : (
            <View className="w-12 h-12 rounded-2xl bg-blue-500 items-center justify-center">
              <BellIcon color="white" size={24} />
            </View>
          )}
          <View className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white" />
        </View>

        <View className="flex-1 ml-4 mr-2">
          <Text className="text-gray-900 font-bold text-[15px] mb-0.5" numberOfLines={1}>
            {title}
          </Text>
          <Text className="text-gray-500 text-[13px] leading-4" numberOfLines={2}>
            {message}
          </Text>
        </View>

        <TouchableOpacity 
          onPress={(e) => {
            e.stopPropagation();
            hide();
          }}
          className="bg-gray-100 p-2 rounded-full"
        >
          <XMarkIcon color="#9ca3af" size={16} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: width - 32,
  },
  shadow: {
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
});

export default InAppNotification;
