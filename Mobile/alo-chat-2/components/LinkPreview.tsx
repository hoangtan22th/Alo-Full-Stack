import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from "react-native";
import { getLinkMetadata, LinkMetadata } from "../utils/linkUtils";

interface LinkPreviewProps {
  url: string;
}

export const LinkPreview = ({ url }: LinkPreviewProps) => {
  const [metadata, setMetadata] = useState<LinkMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchMetadata = async () => {
      try {
        const data = await getLinkMetadata(url);
        if (isMounted) {
          setMetadata(data);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      }
    };

    fetchMetadata();

    return () => {
      isMounted = false;
    };
  }, [url]);

  const handlePress = () => {
    Linking.openURL(url).catch((err) =>
      console.error("Couldn't load page", err),
    );
  };

  if (loading) {
    return (
      <View className="bg-gray-50 rounded-xl p-3 flex-row items-center mb-2 border border-gray-100">
        <View className="w-12 h-12 bg-gray-200 rounded-lg animate-pulse" />
        <View className="ml-3 flex-1">
          <View className="h-4 bg-gray-200 rounded w-3/4 mb-2 animate-pulse" />
          <View className="h-3 bg-gray-200 rounded w-1/2 animate-pulse" />
        </View>
      </View>
    );
  }

  if (error || !metadata) {
    return (
      <TouchableOpacity
        onPress={handlePress}
        className="bg-gray-50 rounded-xl p-3 flex-row items-center mb-2 border border-gray-100"
      >
        <View className="w-10 h-10 bg-blue-50 rounded-full items-center justify-center mr-3">
          <Text className="text-blue-500 font-bold">🔗</Text>
        </View>
        <Text className="flex-1 text-blue-500 text-[14px]" numberOfLines={1}>
          {url}
        </Text>
      </TouchableOpacity>
    );
  }

  const { title, description, image, siteName } = metadata;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      className="bg-white rounded-xl overflow-hidden mb-3 border border-gray-100 shadow-sm"
    >
      <View className="flex-row">
        {image ? (
          <Image
            source={{ uri: image }}
            className="w-24 min-h-24 bg-gray-100"
            resizeMode="cover"
          />
        ) : (
          <View className="w-24 h-24 bg-blue-50 items-center justify-center">
            <Text className="text-2xl">🌍</Text>
          </View>
        )}
        <View className="flex-1 p-3 justify-center">
          <Text
            className="text-[14px] font-bold text-gray-900 mb-1"
            numberOfLines={2}
          >
            {title || url}
          </Text>
          {description && (
            <Text className="text-[12px] text-gray-500 mb-1.5" numberOfLines={2}>
              {description}
            </Text>
          )}
          <Text className="text-[10px] font-bold text-blue-500 uppercase tracking-tighter">
            {siteName || "Link"}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

