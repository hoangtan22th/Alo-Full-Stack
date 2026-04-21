"use client";
import React, { useEffect, useState } from "react";
import { ChartBarIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { CheckIcon } from "@heroicons/react/24/solid";
import { pollService, PollDTO, PollResultDTO } from "@/services/pollService";
import { useAuthStore } from "@/store/useAuthStore";
import { socketService } from "@/services/socketService";

interface PollMessagePreviewProps {
  pollId: string;
  isSender: boolean;
  onOpenDetails: (pollId: string) => void;
}

export default function PollMessagePreview({ pollId, isSender, onOpenDetails }: PollMessagePreviewProps) {
  const [poll, setPoll] = useState<PollDTO | null>(null);
  const [results, setResults] = useState<PollResultDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const { user } = useAuthStore();
  const currentUserId = user?.id || user?._id || user?.userId;

  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  const fetchPollData = async () => {
    try {
      const [pollData, resultsData] = await Promise.all([
        pollService.getPollDetails(pollId),
        pollService.getPollResults(pollId)
      ]);
      if (pollData) setPoll(pollData);
      if (resultsData) setResults(resultsData);

      if (resultsData && currentUserId) {
        const userVotes: string[] = [];
        resultsData.forEach((res) => {
          if (res.voters.some((v) => v.userId === currentUserId)) {
            userVotes.push(res.optionId);
          }
        });
        setSelectedOptions(userVotes);
      }
    } catch (error) {
      console.error(error);
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
    const handlePollUpdated = (data: any) => {
      if (data.pollId === pollId) {
        fetchPollData();
      }
    };
    const unsubscribe = socketService.onPollUpdated(handlePollUpdated);
    return () => {
      unsubscribe();
    };
  }, [pollId]);

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

  const handleVote = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedOptions.length === 0) return;
    setSubmitting(true);
    try {
      const ok = await pollService.votePoll(pollId, selectedOptions);
      if (ok) {
        fetchPollData();
      }
    } catch (error) {
      console.error("Error voting:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-64 p-4 flex items-center justify-center bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="w-64 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <span className="italic text-sm text-red-400">Bình chọn không khả dụng</span>
      </div>
    );
  }

  const isClosed = poll.status === "CLOSED";
  const isExpired = poll.expiresAt && new Date(poll.expiresAt).getTime() < new Date().getTime();
  const isPollEnded = isClosed || isExpired;

  const initialVoted = results.some((r) => r.voters.some((v) => v.userId === currentUserId));
  const readonly = isPollEnded || initialVoted;

  const totalVotes = results.reduce((acc, r) => acc + r.count, 0) || 1;

  return (
    <div 
      onClick={() => onOpenDetails(pollId)}
      className="w-[95%] sm:w-[500px] md:w-[550px] lg:w-[600px] rounded-3xl overflow-hidden cursor-pointer shadow-md transition-transform hover:-translate-y-0.5 bg-white border border-gray-200"
    >
      {/* Header */}
      <div className="p-5 border-b border-gray-100 flex items-start">
        <div className="p-2.5 rounded-xl mr-3.5 bg-blue-50 text-blue-600">
          <ChartBarIcon className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h4 className="text-[16px] sm:text-[17px] font-bold leading-snug mb-1.5 text-gray-900">{poll.question}</h4>
          {isPollEnded && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600">Đã kết thúc</span>
          )}
          {!isPollEnded && poll.expiresAt && (
            <span className="text-xs font-medium text-gray-400">
              Hết hạn: {new Date(poll.expiresAt).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
            </span>
          )}
        </div>
      </div>

      {/* Options */}
      <div className="p-4 sm:p-5">
        {poll.options.slice(0, 5).map((opt) => {
          const res = results.find((r) => r.optionId === opt._id);
          const count = res ? res.count : 0;
          const percentage = Math.round((count / totalVotes) * 100);
          const isSelected = opt._id ? selectedOptions.includes(opt._id) : false;

          return (
            <div 
              key={opt._id}
              onClick={(e) => {
                if (!readonly) {
                  e.stopPropagation();
                  opt._id && toggleOption(opt._id);
                }
              }}
              className="relative mb-2 p-2 rounded-xl border border-gray-50 hover:bg-gray-50 transition-all"
            >
              <div className="flex items-center z-10 relative">
                {isSelected ? (
                  <div className={`w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center mr-3 sm:mr-4 bg-blue-600 text-white ${poll.settings.allowMultipleAnswers ? 'rounded-md' : 'rounded-full'}`}>
                    <CheckIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                ) : (
                  <div className={`w-5 h-5 sm:w-6 sm:h-6 border-2 mr-3 sm:mr-4 border-gray-300 ${poll.settings.allowMultipleAnswers ? 'rounded-md' : 'rounded-full'}`} />
                )}
                <span className="flex-1 text-[15px] sm:text-[16px] font-medium truncate text-gray-700">{opt.text}</span>
                {(!poll.settings.hideResultsUntilVoted || initialVoted || isPollEnded) && (
                  <span className="text-xs font-bold ml-2 text-gray-500">{count}</span>
                )}
              </div>
              
              {/* Progress bar background */}
              {(!poll.settings.hideResultsUntilVoted || initialVoted || isPollEnded) && (
                <div 
                  className={`absolute top-0 left-0 h-full rounded-xl opacity-20 ${isSelected ? 'bg-blue-600' : 'bg-gray-300'}`}
                  style={{ width: `${percentage}%` }}
                />
              )}
            </div>
          );
        })}
        {poll.options.length > 5 && (
          <div className="text-center text-xs font-medium mt-2 text-gray-400">
            + {poll.options.length - 5} lựa chọn khác
          </div>
        )}
      </div>

      {/* Action footer */}
      <div className="border-t flex border-gray-100">
        {initialVoted ? (
          <button 
            onClick={(e) => { e.stopPropagation(); onOpenDetails(pollId); }}
            className="flex-1 py-3.5 sm:py-4 text-[15px] sm:text-[16px] font-bold transition-colors text-blue-600 hover:bg-blue-50"
          >
            Đổi bình chọn
          </button>
        ) : (
          <button 
            disabled={submitting || readonly}
            onClick={selectedOptions.length > 0 ? handleVote : (e) => { e.stopPropagation(); onOpenDetails(pollId); }}
            className={`flex-1 py-3.5 sm:py-4 text-[15px] sm:text-[16px] font-bold transition-colors flex items-center justify-center ${selectedOptions.length > 0 ? 'bg-blue-600 text-white hover:bg-blue-700' : 'text-blue-600 hover:bg-blue-50'}`}
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin border-current" />
            ) : selectedOptions.length > 0 ? 'Bình chọn' : 'Xem chi tiết'}
          </button>
        )}
      </div>
    </div>
  );
}
