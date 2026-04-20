import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Image,
  RefreshControl,
  TextInput
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeftIcon, PlusIcon, LockClosedIcon } from "react-native-heroicons/outline";
import { CheckCircleIcon } from "react-native-heroicons/solid";
import { pollService, PollDTO, PollResultDTO } from "../../services/pollService";
import { useAuth } from "../../contexts/AuthContext";
import { useSocket } from "../../contexts/SocketContext";
import { userService, UserProfileDTO } from "../../services/userService";

export default function PollDetailsScreen() {
  const { pollId } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { socket } = useSocket();
  const currentUserId = user?.id || user?._id || user?.userId;

  const [poll, setPoll] = useState<PollDTO | null>(null);
  const [results, setResults] = useState<PollResultDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [userCache, setUserCache] = useState<Record<string, UserProfileDTO>>({});
  
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [newOptionText, setNewOptionText] = useState("");
  const [isAddingOption, setIsAddingOption] = useState(false);

  const fetchPollData = async (isRefresh = false) => {
    if (!pollId) return;
    if (isRefresh) setRefreshing(true);
    try {
      const [pollData, resultsData] = await Promise.all([
        pollService.getPollDetails(pollId as string),
        pollService.getPollResults(pollId as string)
      ]);
      if (pollData) setPoll(pollData);
      if (resultsData) setResults(resultsData);
      
      // Auto-select user votes
      if (resultsData && currentUserId) {
         const userVotes: string[] = [];
         resultsData.forEach(res => {
           if (res.voters.some(v => v.userId === currentUserId)) {
             userVotes.push(res.optionId);
           }
         });
         setSelectedOptions(userVotes);
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (isRefresh) setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPollData();
  }, [pollId, currentUserId]);

  useEffect(() => {
     if (!socket || !pollId) return;
     const handlePollUpdated = (data: any) => {
       if (data.pollId === pollId) {
         fetchPollData();
       }
     };
     socket.on("POLL_UPDATED", handlePollUpdated);
     return () => {
        socket.off("POLL_UPDATED", handlePollUpdated);
     };
  }, [socket, pollId]);

  // Fetch user profiles for avatars
  useEffect(() => {
     const fetchUsers = async () => {
        if (!poll || poll.settings.hideVoters) return; // Không cần fetch nếu ẩn danh
        const userIds = new Set<string>();
        results.forEach(r => r.voters.forEach(v => userIds.add(v.userId)));
        
        const missingIds = Array.from(userIds).filter(id => !userCache[id]);
        if (missingIds.length === 0) return;

        const newProfiles: Record<string, UserProfileDTO> = {};
        await Promise.all(
          missingIds.map(async (id) => {
            try {
              const profile = await userService.getUserById(id);
              if (profile) newProfiles[id] = profile;
            } catch (err) {
              // ignore
            }
          })
        );
        if (Object.keys(newProfiles).length > 0) {
           setUserCache(prev => ({ ...prev, ...newProfiles }));
        }
     };
     fetchUsers();
  }, [results, poll]);

  const toggleOption = (optionId: string) => {
    if (poll?.status === "CLOSED") return;
    
    if (poll?.settings.allowMultipleAnswers) {
      if (selectedOptions.includes(optionId)) {
        setSelectedOptions(prev => prev.filter(id => id !== optionId));
      } else {
        setSelectedOptions(prev => [...prev, optionId]);
      }
    } else {
      setSelectedOptions([optionId]);
    }
  };

  const handleVote = async () => {
     if (selectedOptions.length === 0) return;
     setSubmitting(true);
     try {
       const ok = await pollService.votePoll(pollId as string, selectedOptions);
       if (ok) {
         fetchPollData();
         Alert.alert("Thành công", "Đã ghi nhận bình chọn.");
       } else {
         Alert.alert("Lỗi", "Không thể ghi nhận bình chọn.");
       }
     } catch(e) {
        Alert.alert("Lỗi", "Có lỗi xảy ra.");
     } finally {
       setSubmitting(false);
     }
  };

  const handleAddOption = async () => {
     if (!newOptionText.trim()) return;
     setIsAddingOption(true);
     try {
        const res = await pollService.addPollOption(pollId as string, newOptionText.trim());
        if (res) {
           setNewOptionText("");
           fetchPollData();
        } else {
           Alert.alert("Lỗi", "Không thể thêm phương án.");
        }
     } catch(e) {
        // ignore
     } finally {
        setIsAddingOption(false);
     }
  };

  const handleClosePoll = () => {
      Alert.alert(
        "Khóa bình chọn",
        "Bạn có chắc muốn khóa bình chọn này? Người khác sẽ không thể tiếp tục bình chọn.",
        [
          { text: "Hủy", style: "cancel" },
          { 
            text: "Khóa", 
            style: "destructive",
            onPress: async () => {
               const ok = await pollService.closePoll(pollId as string);
               if (ok) {
                  fetchPollData();
               }
            }
          }
        ]
      )
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f9fafb" }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!poll) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f9fafb" }}>
        <Text style={{ fontSize: 16, color: "#6b7280" }}>Không tìm thấy bình chọn</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16, padding: 12, backgroundColor: "#3b82f6", borderRadius: 8 }}>
            <Text style={{ color: "white", fontWeight: "bold" }}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isClosed = poll.status === "CLOSED";
  const isExpired = !!(poll.expiresAt && new Date(poll.expiresAt).getTime() < new Date().getTime());
  const readonly = !!(isClosed || isExpired);
  const isCreator = currentUserId && poll.creatorId === currentUserId;

  const totalVotes = results.reduce((acc, r) => acc + r.count, 0) || 1; 
  const totalUniqueVotersObj = new Set<string>();
  results.forEach(r => r.voters.forEach(v => totalUniqueVotersObj.add(v.userId)));
  const totalVotersCount = totalUniqueVotersObj.size;

  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      {/* Header */}
      <View style={{ paddingTop: insets.top, backgroundColor: "white", paddingHorizontal: 16, paddingBottom: 12, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#f3f4f6" }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4, marginRight: 12 }}>
          <ArrowLeftIcon size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: "600", color: "#111827" }} numberOfLines={1}>Chi tiết bình chọn</Text>
      </View>

      <ScrollView 
         style={{ flex: 1 }} 
         contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
         refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchPollData(true)} />}
      >
         {/* Question Area */}
         <View style={{ backgroundColor: "white", borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 }}>
            <Text style={{ fontSize: 20, fontWeight: "bold", color: "#111827", marginBottom: 8 }}>{poll.question}</Text>
            
            <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
               <View style={{ backgroundColor: "#f3f4f6", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                  <Text style={{ fontSize: 12, color: "#4b5563", fontWeight: "500" }}>{totalVotersCount} người đã vote</Text>
               </View>
               {poll.settings.allowMultipleAnswers && (
                 <View style={{ backgroundColor: "#e0f2fe", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                    <Text style={{ fontSize: 12, color: "#0369a1", fontWeight: "500" }}>Nhiều lựa chọn</Text>
                 </View>
               )}
               {poll.settings.hideVoters && (
                 <View style={{ backgroundColor: "#fef3c7", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                    <Text style={{ fontSize: 12, color: "#b45309", fontWeight: "500" }}>Ẩn danh</Text>
                 </View>
               )}
               {isClosed && (
                 <View style={{ backgroundColor: "#fee2e2", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, flexDirection: "row", alignItems: "center" }}>
                    <LockClosedIcon size={12} color="#b91c1c" style={{ marginRight: 4 }} />
                    <Text style={{ fontSize: 12, color: "#b91c1c", fontWeight: "500" }}>Đã khóa</Text>
                 </View>
               )}
               {!isClosed && poll.expiresAt && (
                  <View style={{ backgroundColor: "#f3f4f6", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                     <Text style={{ fontSize: 12, color: "#4b5563", fontWeight: "500" }}>
                       Hết hạn: {new Date(poll.expiresAt).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                     </Text>
                  </View>
               )}
            </View>
         </View>

         {/* Options */}
         <View style={{ marginBottom: 24 }}>
            {poll.options.map(opt => {
               const res = results.find(r => r.optionId === opt._id);
               const count = res ? res.count : 0;
               const voters = res ? res.voters : [];
               const percentage = Math.round((count / (totalVotes || 1)) * 100);
               const isSelected = selectedOptions.includes(opt._id as string);

               return (
                  <TouchableOpacity 
                     key={opt._id}
                     activeOpacity={0.7}
                     disabled={readonly}
                     onPress={() => toggleOption(opt._id as string)}
                     style={{
                        backgroundColor: "white", 
                        borderRadius: 16, 
                        padding: 16, 
                        marginBottom: 12,
                        borderWidth: 2,
                        borderColor: isSelected ? "#3b82f6" : "transparent",
                        shadowColor: "#000", 
                        shadowOffset: { width: 0, height: 1 }, 
                        shadowOpacity: 0.05, 
                        shadowRadius: 2, 
                        elevation: 1 
                     }}
                  >
                     <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                        {isSelected ? (
                           <CheckCircleIcon size={24} color="#3b82f6" style={{ marginRight: 12 }} />
                        ) : (
                           <View style={{ width: 24, height: 24, borderRadius: poll.settings.allowMultipleAnswers ? 6 : 12, borderWidth: 1.5, borderColor: "#d1d5db", marginRight: 12 }} />
                        )}
                        <Text style={{ flex: 1, fontSize: 16, color: "#111827", fontWeight: isSelected ? "600" : "normal" }}>{opt.text}</Text>
                        
                        <View style={{ alignItems: "flex-end" }}>
                           <Text style={{ fontSize: 16, fontWeight: "bold", color: "#374151" }}>{count}</Text>
                        </View>
                     </View>

                     {/* Tiền độ % */}
                     <View style={{ height: 6, backgroundColor: "#f3f4f6", borderRadius: 3, overflow: "hidden", marginBottom: 12 }}>
                        <View style={{ height: "100%", width: `${percentage}%`, backgroundColor: isSelected ? "#3b82f6" : "#9ca3af" }} />
                     </View>

                     {/* Avatars */}
                     {!poll.settings.hideVoters && count > 0 && (
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                           {voters.slice(0, 5).map((v, i) => {
                              const profile = userCache[v.userId];
                              const avatarUri = profile?.avatar;
                              
                              return avatarUri ? (
                                 <Image 
                                    key={v.userId} 
                                    source={{ uri: avatarUri }} 
                                    style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: "white", marginLeft: i > 0 ? -8 : 0 }} 
                                 />
                              ) : (
                                 <View key={v.userId} style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "#e5e7eb", borderWidth: 1.5, borderColor: "white", marginLeft: i > 0 ? -8 : 0, alignItems: "center", justifyContent: "center" }}>
                                    <Text style={{ fontSize: 10, fontWeight: "bold", color: "#6b7280" }}>
                                      {profile?.fullName?.charAt(0) || "?"}
                                    </Text>
                                 </View>
                              );
                           })}
                           {count > 5 && (
                              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "#f3f4f6", borderWidth: 1.5, borderColor: "white", marginLeft: -8, alignItems: "center", justifyContent: "center" }}>
                                 <Text style={{ fontSize: 10, fontWeight: "600", color: "#6b7280" }}>+{count - 5}</Text>
                              </View>
                           )}
                        </View>
                     )}
                  </TouchableOpacity>
               );
            })}
         </View>

         {/* Add Option */}
         {poll.settings.allowAddOptions && !readonly && (
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "white", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8 }}>
               <TextInput 
                  style={{ flex: 1, fontSize: 16, paddingVertical: 10, color: "#111827" }} 
                  placeholder="Thêm lựa chọn mới..." 
                  value={newOptionText}
                  onChangeText={setNewOptionText}
               />
               <TouchableOpacity 
                 onPress={handleAddOption} 
                 disabled={isAddingOption || !newOptionText.trim()}
                 style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center", backgroundColor: newOptionText.trim() ? "#3b82f6" : "#f3f4f6", borderRadius: 20 }}
               >
                  {isAddingOption ? <ActivityIndicator size="small" color="white" /> : <PlusIcon size={20} color={newOptionText.trim() ? "white" : "#9ca3af"} />}
               </TouchableOpacity>
            </View>
         )}

         {/* Admin action: Close poll */}
         {isCreator && !readonly && (
            <TouchableOpacity 
               onPress={handleClosePoll}
               style={{ marginTop: 24, paddingVertical: 14, alignItems: "center", borderRadius: 12, borderWidth: 1, borderColor: "#ef4444", backgroundColor: "#fef2f2" }}
            >
               <Text style={{ fontSize: 16, fontWeight: "600", color: "#ef4444" }}>Khóa bình chọn</Text>
            </TouchableOpacity>
         )}
      </ScrollView>

      {/* Floating Action Button for Voting */}
      {!readonly && (
         <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 16), paddingTop: 16, backgroundColor: "white", borderTopWidth: 1, borderTopColor: "#f3f4f6" }}>
            <TouchableOpacity 
               onPress={handleVote}
               disabled={submitting || selectedOptions.length === 0}
               style={{ backgroundColor: selectedOptions.length > 0 ? "#3b82f6" : "#e5e7eb", paddingVertical: 16, borderRadius: 16, alignItems: "center", shadowColor: selectedOptions.length > 0 ? "#3b82f6" : "transparent", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: selectedOptions.length > 0 ? 4 : 0 }}
            >
               {submitting ? (
                  <ActivityIndicator color="white" />
               ) : (
                  <Text style={{ fontSize: 16, fontWeight: "bold", color: selectedOptions.length > 0 ? "white" : "#9ca3af" }}>Gửi bình chọn</Text>
               )}
            </TouchableOpacity>
         </View>
      )}
    </View>
  );
}
