import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeftIcon,
  PlusIcon,
  DocumentTextIcon,
  LinkIcon,
  TrashIcon,
  PencilIcon,
} from "react-native-heroicons/outline";
import { groupService } from "../../services/groupService";
import { noteService, NoteDTO } from "../../services/noteService";
import { useAuth } from "../../contexts/AuthContext";
import { useSocket } from "../../contexts/SocketContext";
import { LinkPreview } from "../../components/LinkPreview";

export default function NotesManagementScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { socket } = useSocket();
  const currentUserId = user?.id || user?._id || user?.userId;

  const [notes, setNotes] = useState<NoteDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [canCreate, setCanCreate] = useState(false);
  const [isManager, setIsManager] = useState(false);

  const fetchData = async (isRefresh = false) => {
    if (!id) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [groupRes, notesData] = await Promise.all([
        groupService.getGroupById(id as string),
        noteService.getNotesByConversation(id as string),
      ]);

      setNotes(notesData);

      // Check permission to create note
      let groupData = groupRes;
      if (groupRes?.data?.data) groupData = groupRes.data.data;
      else if (groupRes?.data) groupData = groupRes.data;

      const member = groupData?.members?.find((m: any) => m.userId === currentUserId);
      const managerStatus = member?.role === "LEADER" || member?.role === "DEPUTY";
      setIsManager(managerStatus);
      const createNoteSetting = groupData?.permissions?.createNotes || "EVERYONE";
      setCanCreate(managerStatus || createNoteSetting === "EVERYONE");
    } catch (error) {
      console.error("Lỗi fetch notes list:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [id])
  );

  useEffect(() => {
    if (!socket || !id) return;

    const handleGroupUpdated = (data: any) => {
      const updatedId = data._id || data.id || data.conversationId;
      if (String(updatedId) === String(id)) {
        fetchData(true);
      }
    };

    const handleNoteCreated = (newNote: NoteDTO) => {
      if (newNote.conversationId === id) {
        setNotes((prev) => [newNote, ...prev]);
      }
    };

    const handleNoteDeleted = (data: { noteId: string }) => {
      setNotes((prev) => prev.filter((n) => n._id !== data.noteId));
    };

    const handleNoteUpdated = (updatedNote: NoteDTO) => {
      setNotes((prev) =>
        prev.map((n) => (n._id === updatedNote._id ? updatedNote : n)),
      );
    };

    socket.on("GROUP_UPDATED", handleGroupUpdated);
    socket.on("NOTE_CREATED", handleNoteCreated);
    socket.on("NOTE_DELETED", handleNoteDeleted);
    socket.on("NOTE_UPDATED", handleNoteUpdated);

    return () => {
      socket.off("GROUP_UPDATED", handleGroupUpdated);
      socket.off("NOTE_CREATED", handleNoteCreated);
      socket.off("NOTE_DELETED", handleNoteDeleted);
      socket.off("NOTE_UPDATED", handleNoteUpdated);
    };
  }, [socket, id]);

  const handleDeleteNote = (noteId: string) => {
    Alert.alert("Xóa ghi chú", "Bạn có chắc chắn muốn xóa ghi chú này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          const success = await noteService.deleteNote(noteId);
          if (success) {
            setNotes((prev) => prev.filter((n) => n._id !== noteId));
            Alert.alert("Thành công", "Ghi chú đã được xóa.");
          } else {
            Alert.alert("Lỗi", "Không thể xóa ghi chú.");
          }
        },
      },
    ]);
  };

  const renderNoteItem = ({ item }: { item: NoteDTO }) => {
    const isCreator = item.creatorId === currentUserId;
    const canDelete = isCreator || isManager;

    return (
      <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-200">
        <View className="flex-row justify-between items-start mb-2">
          <View className="flex-1 mr-2">
            <Text className="text-[15px] text-gray-800 leading-6">
              {item.content}
            </Text>
          </View>
          <View className="flex-row items-center">
            {isCreator && (
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: "/chat/create-note",
                    params: {
                      id,
                      noteId: item._id,
                      initialContent: item.content,
                      initialLinks: JSON.stringify(item.links),
                    },
                  })
                }
                className="p-1 mr-2"
              >
                <PencilIcon size={18} color="#3b82f6" />
              </TouchableOpacity>
            )}
            {canDelete && (
              <TouchableOpacity
                onPress={() => handleDeleteNote(item._id)}
                className="p-1"
              >
                <TrashIcon size={18} color="#ef4444" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {item.links && item.links.length > 0 && (
          <View className="mt-3 pt-3 border-t border-gray-50">
            <Text className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-2">
              Liên kết
            </Text>
            {item.links.map((link, index) => (
              <LinkPreview key={index} url={link} />
            ))}
          </View>
        )}

        <View className="mt-3 flex-row justify-between items-center">
          <Text className="text-[11px] text-gray-400">
            {new Date(item.createdAt).toLocaleString("vi-VN")}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View
        style={{ paddingTop: insets.top }}
        className="bg-white border-b border-gray-100 flex-row items-center justify-between px-4 pb-3"
      >
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ArrowLeftIcon size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900">Ghi chú</Text>
        <View className="w-10" />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(item) => item._id}
          renderItem={renderNoteItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} />
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center mt-20">
              <DocumentTextIcon size={64} color="#d1d5db" />
              <Text className="text-gray-400 mt-4 text-[15px]">
                Chưa có ghi chú nào
              </Text>
            </View>
          }
        />
      )}

      {/* Floating Create Button */}
      {canCreate && (
        <TouchableOpacity
          style={{ bottom: insets.bottom + 20 }}
          className="absolute right-6 w-14 h-14 bg-blue-500 rounded-full items-center justify-center shadow-lg shadow-blue-500/40"
          onPress={() => router.push(`/chat/create-note?id=${id}`)}
        >
          <PlusIcon size={28} color="white" />
        </TouchableOpacity>
      )}
    </View>
  );
}

