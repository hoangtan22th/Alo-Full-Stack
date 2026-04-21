import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  TextInput,
  Alert,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeftIcon, UserGroupIcon } from "react-native-heroicons/outline";
import { CheckIcon } from "react-native-heroicons/solid";
import api from "../../services/api";
import { userService, UserProfileDTO } from "../../services/userService";
import { useAuth } from "../../contexts/AuthContext";

export default function CreateGroupFromPollScreen() {
  const { voterIds: voterIdsRaw, optionText, pollQuestion } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const voterIds: string[] = React.useMemo(() => {
    try {
      return JSON.parse(voterIdsRaw as string);
    } catch {
      return [];
    }
  }, [voterIdsRaw]);

  const [groupName, setGroupName] = useState(`Nhóm - ${optionText || ""}`);
  const [selectedIds, setSelectedIds] = useState<string[]>(voterIds);
  const [profiles, setProfiles] = useState<Record<string, UserProfileDTO>>({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const fetchProfiles = async () => {
      const results: Record<string, UserProfileDTO> = {};
      await Promise.all(
        voterIds.map(async (id) => {
          try {
            const profile = await userService.getUserById(id);
            if (profile) results[id] = profile;
          } catch {
            // ignore
          }
        })
      );
      setProfiles(results);
      setLoading(false);
    };
    fetchProfiles();
  }, [voterIds]);

  const toggleMember = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleCreate = async () => {
    if (selectedIds.length < 2) {
      Alert.alert("Lỗi", "Cần ít nhất 2 người để tạo nhóm");
      return;
    }
    setCreating(true);
    try {
      const result = await api.post<any, any>(`/groups`, {
        name: groupName.trim() || `Nhóm - ${optionText}`,
        userIds: selectedIds,
        fromPoll: true,
      });
      const newGroupId = result?.data?._id || result?._id;
      Alert.alert("Thành công", "Đã tạo nhóm thành công!", [
        {
          text: "OK",
          onPress: () => {
            if (newGroupId) {
              router.replace({
                pathname: "/chat/[id]",
                params: { id: newGroupId },
              });
            } else {
              router.back();
            }
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert("Lỗi", error?.response?.data?.error || "Không thể tạo nhóm");
    } finally {
      setCreating(false);
    }
  };

  const renderMember = ({ item: id }: { item: string }) => {
    const profile = profiles[id];
    const isSelected = selectedIds.includes(id);
    const name = profile?.fullName || profile?.username || "Người dùng";
    const avatar = profile?.avatar;

    return (
      <TouchableOpacity
        onPress={() => toggleMember(id)}
        activeOpacity={0.7}
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 12,
          marginHorizontal: 16,
          marginBottom: 8,
          backgroundColor: isSelected ? "#eff6ff" : "#f9fafb",
          borderRadius: 16,
          borderWidth: 2,
          borderColor: isSelected ? "#3b82f6" : "transparent",
        }}
      >
        {/* Checkbox */}
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            backgroundColor: isSelected ? "#3b82f6" : "transparent",
            borderWidth: isSelected ? 0 : 1.5,
            borderColor: "#d1d5db",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}
        >
          {isSelected && <CheckIcon size={14} color="white" />}
        </View>

        {/* Avatar */}
        {avatar ? (
          <Image
            source={{ uri: avatar }}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              marginRight: 12,
            }}
          />
        ) : (
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "#3b82f6",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
            }}
          >
            <Text style={{ color: "white", fontWeight: "bold", fontSize: 16 }}>
              {name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <Text
          style={{
            flex: 1,
            fontSize: 15,
            fontWeight: isSelected ? "600" : "normal",
            color: "#111827",
          }}
        >
          {name}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top,
          backgroundColor: "white",
          paddingHorizontal: 16,
          paddingBottom: 12,
          flexDirection: "row",
          alignItems: "center",
          borderBottomWidth: 1,
          borderBottomColor: "#f3f4f6",
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ padding: 4, marginRight: 12 }}
        >
          <ArrowLeftIcon size={24} color="#374151" />
        </TouchableOpacity>
        <Text
          style={{
            flex: 1,
            fontSize: 18,
            fontWeight: "600",
            color: "#111827",
          }}
          numberOfLines={1}
        >
          Tạo nhóm từ bình chọn
        </Text>
      </View>

      {/* Group Name Input */}
      <View style={{ padding: 16 }}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: "bold",
            color: "#374151",
            marginBottom: 8,
          }}
        >
          Tên nhóm
        </Text>
        <TextInput
          value={groupName}
          onChangeText={setGroupName}
          placeholder="Nhập tên nhóm..."
          style={{
            backgroundColor: "#f9fafb",
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 12,
            fontSize: 15,
            color: "#111827",
            borderWidth: 1,
            borderColor: "#e5e7eb",
          }}
        />

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 16,
          }}
        >
          <Text
            style={{ fontSize: 14, fontWeight: "bold", color: "#374151" }}
          >
            Thành viên ({selectedIds.length}/{voterIds.length})
          </Text>
          <TouchableOpacity
            onPress={() =>
              setSelectedIds(
                selectedIds.length === voterIds.length ? [] : [...voterIds]
              )
            }
          >
            <Text
              style={{ fontSize: 13, fontWeight: "bold", color: "#3b82f6" }}
            >
              {selectedIds.length === voterIds.length
                ? "Bỏ chọn tất cả"
                : "Chọn tất cả"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Member list */}
      {loading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <FlatList
          data={voterIds}
          keyExtractor={(item) => item}
          renderItem={renderMember}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

      {/* Create button */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: 16,
          paddingBottom: Math.max(insets.bottom, 16),
          paddingTop: 8,
          backgroundColor: "white",
          borderTopWidth: 1,
          borderTopColor: "#f3f4f6",
        }}
      >
        <TouchableOpacity
          onPress={handleCreate}
          disabled={creating || selectedIds.length < 2}
          style={{
            backgroundColor:
              selectedIds.length >= 2 ? "#3b82f6" : "#e5e7eb",
            paddingVertical: 16,
            borderRadius: 16,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
          }}
        >
          {creating ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <UserGroupIcon size={20} color={selectedIds.length >= 2 ? "white" : "#9ca3af"} style={{ marginRight: 8 }} />
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "bold",
                  color: selectedIds.length >= 2 ? "white" : "#9ca3af",
                }}
              >
                Tạo nhóm ({selectedIds.length} thành viên)
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
