import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { ChartBarIcon, CheckCircleIcon, CheckIcon } from "react-native-heroicons/solid";
import { PlusCircleIcon } from "react-native-heroicons/outline";
import {
  pollService,
  PollDTO,
  PollResultDTO,
} from "../../services/pollService";
import { useAuth } from "../../contexts/AuthContext";
import { useSocket } from "../../contexts/SocketContext";
import { useRouter } from "expo-router";

interface PollMessagePreviewProps {
  pollId: string;
  isSender: boolean;
}

export const PollMessagePreview = ({
  pollId,
  isSender,
}: PollMessagePreviewProps) => {
  const [poll, setPoll] = useState<PollDTO | null>(null);
  const [results, setResults] = useState<PollResultDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const { user } = useAuth();
  const { socket } = useSocket();
  const currentUserId = user?.id || user?._id || user?.userId;
  const router = useRouter();

  // Selected options directly on the bubble
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  const fetchPollData = async () => {
    try {
      const [pollData, resultsData] = await Promise.all([
        pollService.getPollDetails(pollId),
        pollService.getPollResults(pollId),
      ]);
      if (pollData) setPoll(pollData);
      if (resultsData) setResults(resultsData);

      // Khôi phục trạng thái đã chọn trước đó của user
      if (resultsData && currentUserId) {
        const userVotes: string[] = [];
        resultsData.forEach((res) => {
          if (res.voters.some((v) => v.userId === currentUserId)) {
            userVotes.push(res.optionId);
          }
        });
        setSelectedOptions(userVotes);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (pollId) {
      fetchPollData();
    }
  }, [pollId, currentUserId]);

  useEffect(() => {
    if (!socket) return;
    // Nghe sự kiện cập nhật poll
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

  const toggleOption = (optionId: string) => {
    if (poll?.status === "CLOSED") return;

    if (poll?.settings.allowMultipleAnswers) {
      if (selectedOptions.includes(optionId)) {
        setSelectedOptions((prev) => prev.filter((id) => id !== optionId));
      } else {
        setSelectedOptions((prev) => [...prev, optionId]);
      }
    } else {
      setSelectedOptions([optionId]);
    }
  };

  const handleVote = async () => {
    if (selectedOptions.length === 0) return;
    setSubmitting(true);
    try {
      const ok = await pollService.votePoll(pollId, selectedOptions);
      if (ok) {
        // UI will automatically refresh via Socket, but we can optimistically set it
        fetchPollData();
      } else {
        Alert.alert("Lỗi", "Không thể ghi nhận bình chọn.");
      }
    } catch (e) {
      Alert.alert("Lỗi", "Có lỗi xảy ra.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDetails = () => {
    router.push({
      pathname: "/chat/poll-details",
      params: { pollId },
    });
  };

  if (loading) {
    return (
      <View style={{ padding: 16, alignItems: "center", width: 260 }}>
        <ActivityIndicator color={isSender ? "white" : "#3b82f6"} />
      </View>
    );
  }

  if (!poll) {
    return (
      <View style={{ padding: 16, width: 260 }}>
        <Text
          style={{ color: isSender ? "white" : "#ef4444", fontStyle: "italic" }}
        >
          Bình chọn không khả dụng
        </Text>
      </View>
    );
  }

  const isClosed = poll.status === "CLOSED";
  const isExpired =
    poll.expiresAt && new Date(poll.expiresAt).getTime() < new Date().getTime();
  const isPollEnded = isClosed || isExpired;

  const initialVoted = results.some((r) =>
    r.voters.some((v) => v.userId === currentUserId),
  );
  const hasVoted = initialVoted;
  const readonly = isPollEnded || hasVoted;

  // Tính tổng lượt vote (mỗi user có thể vote nhiều, nên đếm lượt vote)
  const totalVotes = results.reduce((acc, r) => acc + r.count, 0) || 1; // avoid / 0

  return (
    <TouchableOpacity
      onPress={handleOpenDetails}
      activeOpacity={0.95}
      style={{
        width: 300,
        backgroundColor: "white",
        borderRadius: 13,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "#e5e7eb",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }}
    >
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: "#f3f4f6",
          flexDirection: "row",
          alignItems: "flex-start",
        }}
      >
        <View
          style={{
            backgroundColor: "#eff6ff",
            padding: 6,
            borderRadius: 8,
            marginRight: 10,
          }}
        >
          <ChartBarIcon size={20} color="#3b82f6" />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "bold",
              color: "#111827",
              marginBottom: 2,
            }}
          >
            {poll.question}
          </Text>
          {isPollEnded && (
            <Text style={{ fontSize: 12, color: "#ef4444", fontWeight: "500" }}>
              Đã kết thúc
            </Text>
          )}
          {!isPollEnded && poll.expiresAt && (
            <Text style={{ fontSize: 11, color: "#6b7280" }}>
              Hết hạn:{" "}
              {new Date(poll.expiresAt).toLocaleString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
                day: "2-digit",
                month: "2-digit",
              })}
            </Text>
          )}
        </View>
      </View>

      {/* Options */}
      <View style={{ padding: 12 }}>
        {poll.options.slice(0, 5).map((opt) => {
          const res = results.find((r) => r.optionId === opt._id);
          const count = res ? res.count : 0;
          const percentage = Math.round(
            (count / (results.reduce((acc, r) => acc + r.count, 0) || 1)) * 100,
          );
          const isSelected = opt._id
            ? selectedOptions.includes(opt._id)
            : false;

          return (
            <TouchableOpacity
              key={opt._id}
              activeOpacity={0.7}
              onPress={() => opt._id && toggleOption(opt._id)}
              disabled={readonly}
              style={{ marginBottom: 8 }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 4,
                  paddingHorizontal: 4,
                }}
              >
                {isSelected ? (
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: poll.settings.allowMultipleAnswers ? 4 : 10,
                      backgroundColor: "#3b82f6",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 8,
                    }}
                  >
                    <CheckIcon size={14} color="white" />
                  </View>
                ) : (
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: poll.settings.allowMultipleAnswers ? 4 : 10,
                      borderWidth: 1.5,
                      borderColor: "#d1d5db",
                      marginRight: 8,
                    }}
                  />
                )}
                <Text
                  style={{ flex: 1, fontSize: 14, color: "#374151" }}
                  numberOfLines={1}
                >
                  {opt.text}
                </Text>
                {(!poll.settings.hideResultsUntilVoted ||
                  hasVoted ||
                  isPollEnded) && (
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#6b7280",
                      fontWeight: "600",
                    }}
                  >
                    {count}
                  </Text>
                )}
              </View>
              {/* Progress bar */}
              {(!poll.settings.hideResultsUntilVoted ||
                hasVoted ||
                isPollEnded) && (
                <View
                  style={{
                    height: 4,
                    backgroundColor: "#f3f4f6",
                    borderRadius: 2,
                    overflow: "hidden",
                    marginLeft: 32,
                  }}
                >
                  <View
                    style={{
                      height: "100%",
                      width: `${percentage}%`,
                      backgroundColor: isSelected ? "#3b82f6" : "#9ca3af",
                    }}
                  />
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {poll.options.length > 5 && (
          <Text
            style={{
              textAlign: "center",
              fontSize: 12,
              color: "#6b7280",
              fontStyle: "italic",
              marginTop: 4,
            }}
          >
            + {poll.options.length - 5} lựa chọn khác
          </Text>
        )}
      </View>

      {/* Actions */}
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: "#f3f4f6",
        }}
      >
        {hasVoted ? (
          <TouchableOpacity
            onPress={handleOpenDetails}
            style={{
              paddingVertical: 12,
              alignItems: "center",
              backgroundColor: "transparent",
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: "bold", color: "#3b82f6" }}>
              Đổi bình chọn
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={selectedOptions.length > 0 ? handleVote : handleOpenDetails}
            disabled={submitting || readonly}
            style={{
              paddingVertical: 12,
              alignItems: "center",
              backgroundColor: selectedOptions.length > 0 ? "#3b82f6" : "transparent",
            }}
          >
            {submitting ? (
              <ActivityIndicator
                size="small"
                color={selectedOptions.length > 0 ? "white" : "#3b82f6"}
              />
            ) : (
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "bold",
                  color: selectedOptions.length > 0 ? "white" : "#3b82f6",
                }}
              >
                Bình chọn
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};
