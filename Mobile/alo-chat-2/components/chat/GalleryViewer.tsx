import React, { useEffect, useState, useRef } from "react";
import {
  Dimensions,
  Image,
  Text,
  TouchableOpacity,
  View,
  FlatList,
  Modal,
} from "react-native";
import { XMarkIcon } from "react-native-heroicons/outline";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
  withDecay,
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
} from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MessageDTO } from "../../services/messageService";

const { width: windowWidth, height: windowHeight } = Dimensions.get("window");

interface GalleryViewerProps {
  images: MessageDTO[];
  initialIndex: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}

export const GalleryViewer = ({
  images,
  initialIndex,
  onClose,
  onIndexChange,
}: GalleryViewerProps) => {
  const insets = useSafeAreaInsets();
  const pagerX = useSharedValue(-initialIndex * windowWidth);
  const viewerIndexRef = useSharedValue(initialIndex);
  const [localIndex, setLocalIndex] = useState(initialIndex);
  const thumbnailRef = useRef<FlatList>(null);

  useEffect(() => {
    if (thumbnailRef.current) {
      setTimeout(() => {
        thumbnailRef.current?.scrollToIndex({
          index: localIndex,
          animated: true,
          viewPosition: 0.5,
        });
      }, 50);
    }
  }, [localIndex]);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      const basePagerX = -viewerIndexRef.value * windowWidth;
      pagerX.value = basePagerX + event.translationX;
    })
    .onEnd((event) => {
      const totalImages = images.length;
      let nextIndex = viewerIndexRef.value;
      if (event.velocityX > 500 || event.translationX > windowWidth / 3) {
        nextIndex = Math.max(0, viewerIndexRef.value - 1);
      } else if (
        event.velocityX < -500 ||
        event.translationX < -windowWidth / 3
      ) {
        nextIndex = Math.min(totalImages - 1, viewerIndexRef.value + 1);
      }

      pagerX.value = withSpring(-nextIndex * windowWidth, {
        overshootClamping: true,
      });
      viewerIndexRef.value = nextIndex;
      runOnJS(setLocalIndex)(nextIndex);
      runOnJS(onIndexChange)(nextIndex);
    });

  const pagerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pagerX.value }],
  }));

  return (
    <View className="flex-1 bg-black">
      {/* Header */}
      <View
        className="absolute top-0 left-0 right-0 z-50 flex-row justify-between items-center px-6"
        style={{ paddingTop: insets.top + 10 }}
      >
        <Text className="text-white font-bold text-lg">
          {localIndex + 1} / {images.length}
        </Text>
        <TouchableOpacity
          className="p-2 bg-black/50 rounded-full"
          onPress={onClose}
        >
          <XMarkIcon size={28} color="white" />
        </TouchableOpacity>
      </View>

      <GestureDetector gesture={panGesture}>
        <Animated.View
          className="flex-row items-center"
          style={[{ width: windowWidth * images.length }, pagerAnimatedStyle]}
        >
          {images.map((img, idx) => (
            <GalleryItem
              key={img._id}
              item={img}
              index={idx}
              pagerX={pagerX}
              viewerIndexRef={viewerIndexRef}
              onClose={onClose}
              onIndexChange={onIndexChange}
              totalImages={images.length}
            />
          ))}
        </Animated.View>
      </GestureDetector>

      {/* Mini Gallery (Thumbnails) */}
      <View
        className="absolute bottom-0 left-0 right-0 py-6 bg-black/40"
        style={{ paddingBottom: Math.max(insets.bottom, 20) }}
      >
        <FlatList
          ref={thumbnailRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          data={images}
          keyExtractor={(item) => "pager_thumb_" + item._id}
          contentContainerStyle={{
            paddingHorizontal: 20,
            flexGrow: 1,
            justifyContent: "center",
          }}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, index) => ({
            length: 56,
            offset: 56 * index,
            index,
          })}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              onPress={() => {
                setLocalIndex(index);
                viewerIndexRef.value = index;
                pagerX.value = withSpring(-index * windowWidth);
                onIndexChange(index);
              }}
              className={`mr-2 rounded-lg overflow-hidden border-2 ${
                localIndex === index ? "border-white" : "border-transparent"
              }`}
            >
              <Image
                source={{ uri: item.content }}
                className="w-12 h-12"
                resizeMode="cover"
              />
              {localIndex !== index && (
                <View className="absolute inset-0 bg-black/40" />
              )}
            </TouchableOpacity>
          )}
        />
      </View>
    </View>
  );
};

interface GalleryItemProps {
  item: MessageDTO;
  index: number;
  pagerX: any;
  onClose: () => void;
  viewerIndexRef: any;
  onIndexChange: (index: number) => void;
  totalImages: number;
}

const GalleryItem = ({
  item,
  index,
  pagerX,
  onClose,
  viewerIndexRef,
  onIndexChange,
  totalImages,
}: GalleryItemProps) => {
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);

  const savedScale = useSharedValue(1);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    if (viewerIndexRef.value !== index) {
      scale.value = withTiming(1);
      translateX.value = withTiming(0);
      translateY.value = withTiming(0);
      opacity.value = withTiming(1);
      savedScale.value = 1;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
      setIsZoomed(false);
    }
  }, [viewerIndexRef.value, index]);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = Math.max(1, Math.min(savedScale.value * event.scale, 5));
    })
    .onEnd(() => {
      if (scale.value < 1.1) {
        scale.value = withTiming(1);
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedScale.value = 1;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        runOnJS(setIsZoomed)(false);
      } else {
        savedScale.value = scale.value;
        runOnJS(setIsZoomed)(true);
      }
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1.1) {
        scale.value = withTiming(1);
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedScale.value = 1;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        runOnJS(setIsZoomed)(false);
      } else {
        scale.value = withTiming(2.5);
        savedScale.value = 2.5;
        runOnJS(setIsZoomed)(true);
      }
    });

  let panGesture = Gesture.Pan()
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((event) => {
      if (scale.value <= 1.1) {
        translateY.value = event.translationY;
        opacity.value = Math.max(0.5, 1 - Math.abs(event.translationY) / 500);
      } else {
        const maxTranslateX = (windowWidth * (scale.value - 1)) / 2;
        const maxTranslateY = (windowHeight * (scale.value - 1)) / 2;

        let nextX = savedTranslateX.value + event.translationX;
        let nextY = savedTranslateY.value + event.translationY;

        if (nextX > maxTranslateX) {
          const overflow = nextX - maxTranslateX;
          pagerX.value = -index * windowWidth + overflow;
          nextX = maxTranslateX;
        } else if (nextX < -maxTranslateX) {
          const overflow = nextX + maxTranslateX;
          pagerX.value = -index * windowWidth + overflow;
          nextX = -maxTranslateX;
        } else {
          pagerX.value = -index * windowWidth;
        }

        if (nextY > maxTranslateY) nextY = maxTranslateY;
        if (nextY < -maxTranslateY) nextY = -maxTranslateY;

        translateX.value = nextX;
        translateY.value = nextY;
      }
    })
    .onEnd((event) => {
      if (scale.value <= 1.1) {
        if (
          Math.abs(event.velocityY) > 800 ||
          Math.abs(event.translationY) > 150
        ) {
          translateY.value = withTiming(
            event.translationY > 0 ? windowHeight : -windowHeight,
            {},
            () => runOnJS(onClose)(),
          );
        } else {
          translateY.value = withTiming(0);
          opacity.value = withTiming(1);
        }
      } else {
        const maxTranslateX = (windowWidth * (scale.value - 1)) / 2;
        const maxTranslateY = (windowHeight * (scale.value - 1)) / 2;
        const currentPagerX = pagerX.value;
        const basePagerX = -index * windowWidth;
        const diff = currentPagerX - basePagerX;

        if (Math.abs(diff) > windowWidth * 0.2) {
          const nextIndex = diff > 0 ? index - 1 : index + 1;
          if (nextIndex >= 0 && nextIndex < totalImages) {
            pagerX.value = withSpring(-nextIndex * windowWidth, {
              overshootClamping: true,
            });
            viewerIndexRef.value = nextIndex;
            runOnJS(onIndexChange)(nextIndex);
          } else {
            pagerX.value = withSpring(basePagerX);
          }
        } else {
          pagerX.value = withSpring(basePagerX);
          translateX.value = withDecay({
            velocity: event.velocityX,
            clamp: [-maxTranslateX, maxTranslateX],
            rubberBandEffect: true,
          });
          translateY.value = withDecay({
            velocity: event.velocityY,
            clamp: [-maxTranslateY, maxTranslateY],
            rubberBandEffect: true,
          });
        }
      }
    });

  if (!isZoomed) {
    panGesture = panGesture.activeOffsetY([-10, 10]);
  }

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <GestureDetector
      gesture={Gesture.Simultaneous(pinchGesture, panGesture, doubleTap)}
    >
      <Animated.View
        style={[
          {
            width: windowWidth,
            height: windowHeight,
            justifyContent: "center",
            alignItems: "center",
          },
          animatedStyle,
        ]}
      >
        <Image
          source={{ uri: item.content }}
          style={{ width: "100%", height: "100%" }}
          resizeMode="contain"
        />
      </Animated.View>
    </GestureDetector>
  );
};

interface GalleryViewerModalProps extends GalleryViewerProps {
  visible: boolean;
}

export const GalleryViewerModal = (props: GalleryViewerModalProps) => {
  if (!props.visible) return null;
  return (
    <Modal
      visible={props.visible}
      transparent
      animationType="fade"
      onRequestClose={props.onClose}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <GalleryViewer {...props} />
      </GestureHandlerRootView>
    </Modal>
  );
};
