"use client";
import React, { useEffect, useState } from "react";
import { 
  XMarkIcon, 
  PlusIcon,
  ChartBarIcon,
  UserGroupIcon
} from "@heroicons/react/24/outline";
import { CheckIcon, LockClosedIcon } from "@heroicons/react/24/solid";
import { pollService, PollDTO, PollResultDTO } from "@/services/pollService";
import { useAuthStore } from "@/store/useAuthStore";
import { socketService } from "@/services/socketService";
import api from "@/services/api";

interface PollDetailsModalProps {
  pollId: string;
  onClose: () => void;
}

export default function PollDetailsModal({ pollId, onClose }: PollDetailsModalProps) {
  const [poll, setPoll] = useState<PollDTO | null>(null);
  const [results, setResults] = useState<PollResultDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userCache, setUserCache] = useState<Record<string, any>>({});
  
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [initialVotes, setInitialVotes] = useState<string[]>([]);
  const [newOptionText, setNewOptionText] = useState("");
  const [isAddingOption, setIsAddingOption] = useState(false);

  const { user } = useAuthStore();
  const currentUserId = user?.id || user?._id || user?.userId;

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
        resultsData.forEach(res => {
          if (res.voters.some(v => v.userId === currentUserId)) {
            userVotes.push(res.optionId);
          }
        });
        setSelectedOptions(userVotes);
        setInitialVotes(userVotes);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (pollId) fetchPollData();
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

  useEffect(() => {
    const fetchUsers = async () => {
      if (!poll || poll.settings.hideVoters) return;
      const userIds = new Set<string>();
      results.forEach(r => r.voters.forEach(v => userIds.add(v.userId)));
      
      const missingIds = Array.from(userIds).filter(id => !userCache[id]);
      if (missingIds.length === 0) return;

      const newProfiles: Record<string, any> = {};
      await Promise.all(
        missingIds.map(async (id) => {
          try {
            const res: any = await api.get(`/users/${id}`);
            const profile = res?.data || res;
            if (profile) newProfiles[id] = profile;
          } catch (err) {
            console.error("Lỗi lấy thông tin user cho poll", err);
          }
        })
      );
      if (Object.keys(newProfiles).length > 0) {
        setUserCache(prev => ({ ...prev, ...newProfiles }));
      }
    };
    fetchUsers();
  }, [results, poll, userCache]);

  const toggleOption = (optionId: string) => {
    if (poll?.status === "CLOSED") return;
    
    if (poll?.settings.allowMultipleAnswers) {
      if (selectedOptions.includes(optionId)) {
        setSelectedOptions(prev => prev.filter(id => id !== optionId));
      } else {
        setSelectedOptions(prev => [...prev, optionId]);
      }
    } else {
      if (selectedOptions.includes(optionId)) {
        setSelectedOptions([]);
      } else {
        setSelectedOptions([optionId]);
      }
    }
  };

  const handleVote = async () => {
    if (selectedOptions.length === 0 && initialVotes.length === 0) return;
    setSubmitting(true);
    try {
      const ok = await pollService.votePoll(pollId, selectedOptions);
      if (ok) {
        fetchPollData();
      }
    } catch(e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddOption = async () => {
    if (!newOptionText.trim()) return;
    setIsAddingOption(true);
    try {
      const res = await pollService.addPollOption(pollId, newOptionText.trim());
      if (res) {
        setNewOptionText("");
        fetchPollData();
      }
    } catch(e) {
      console.error(e);
    } finally {
      setIsAddingOption(false);
    }
  };

  const handleClosePoll = async () => {
    if (confirm("Bạn có chắc muốn khóa bình chọn này? Người khác sẽ không thể tiếp tục bình chọn.")) {
      const ok = await pollService.closePoll(pollId);
      if (ok) fetchPollData();
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
          <p className="text-gray-500 font-medium mb-6">Không tìm thấy bình chọn</p>
          <button onClick={onClose} className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition">
            Đóng
          </button>
        </div>
      </div>
    );
  }

  const isClosed = poll.status === "CLOSED";
  const isExpired = !!(poll.expiresAt && new Date(poll.expiresAt).getTime() < new Date().getTime());
  const readonly = isClosed || isExpired;
  const isCreator = currentUserId && poll.creatorId === currentUserId;

  const totalVotes = results.reduce((acc, r) => acc + r.count, 0) || 1; 
  const totalUniqueVotersObj = new Set<string>();
  results.forEach(r => r.voters.forEach(v => totalUniqueVotersObj.add(v.userId)));
  const totalVotersCount = totalUniqueVotersObj.size;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-lg font-black text-gray-900">Chi tiết bình chọn</h2>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Thăm dò ý kiến</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white hover:shadow-sm rounded-full transition-all text-gray-400 hover:text-gray-600">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 custom-scrollbar">
          {/* Question Area */}
          <div className="mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-3">{poll.question}</h3>
            
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center bg-gray-100 px-2.5 py-1 rounded-lg">
                <UserGroupIcon className="w-3.5 h-3.5 text-gray-500 mr-1.5" />
                <span className="text-xs font-semibold text-gray-600">{totalVotersCount} người đã vote</span>
              </div>
              
              {poll.settings.allowMultipleAnswers && (
                <span className="text-xs font-semibold bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg">
                  Nhiều lựa chọn
                </span>
              )}
              
              {poll.settings.hideVoters && (
                <span className="text-xs font-semibold bg-orange-50 text-orange-600 px-2.5 py-1 rounded-lg">
                  Ẩn danh
                </span>
              )}
              
              {isClosed && (
                <div className="flex items-center bg-red-50 px-2.5 py-1 rounded-lg">
                  <LockClosedIcon className="w-3.5 h-3.5 text-red-600 mr-1" />
                  <span className="text-xs font-semibold text-red-600">Đã khóa</span>
                </div>
              )}

              {!isClosed && poll.expiresAt && (
                <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg">
                  Hết hạn: {new Date(poll.expiresAt).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                </span>
              )}
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3 mb-6">
            {poll.options.map(opt => {
              const res = results.find(r => r.optionId === opt._id);
              const count = res ? res.count : 0;
              const voters = res ? res.voters : [];
              const percentage = Math.round((count / totalVotes) * 100);
              const isSelected = opt._id ? selectedOptions.includes(opt._id) : false;

              return (
                <div 
                  key={opt._id}
                  onClick={() => !readonly && opt._id && toggleOption(opt._id)}
                  className={`relative p-4 rounded-2xl border-2 transition-all ${!readonly && 'cursor-pointer hover:shadow-md'} ${isSelected ? 'border-blue-500 bg-blue-50/30' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                >
                  <div className="flex items-start z-10 relative">
                    <div className="mt-0.5 mr-3">
                      {isSelected ? (
                        <div className={`w-5 h-5 flex items-center justify-center bg-blue-500 text-white ${poll.settings.allowMultipleAnswers ? 'rounded-md' : 'rounded-full'}`}>
                          <CheckIcon className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div className={`w-5 h-5 border-2 border-gray-300 ${poll.settings.allowMultipleAnswers ? 'rounded-md' : 'rounded-full'}`} />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1.5">
                        <span className={`text-[15px] font-medium pr-3 ${isSelected ? 'text-gray-900 font-bold' : 'text-gray-700'}`}>{opt.text}</span>
                        <span className="text-[15px] font-black text-gray-900">{count}</span>
                      </div>
                      
                      {/* Progress bar */}
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden w-full">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${isSelected ? 'bg-blue-500' : 'bg-gray-400'}`} 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>

                      {/* Voters Avatars */}
                      {!poll.settings.hideVoters && count > 0 && (
                        <div className="flex items-center mt-3">
                          {voters.slice(0, 5).map((v, i) => {
                            const profile = userCache[v.userId];
                            const avatarUri = profile?.avatar;
                            const name = profile?.fullName || profile?.username || profile?.name || '?';
                            
                            return (
                              <div key={v.userId} className={`w-6 h-6 rounded-full border-2 border-white overflow-hidden bg-gray-200 flex items-center justify-center ${i > 0 ? '-ml-2' : ''}`} title={name}>
                                {avatarUri ? (
                                  <img src={avatarUri} alt={name} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-[9px] font-bold text-gray-500 uppercase">{name.charAt(0)}</span>
                                )}
                              </div>
                            );
                          })}
                          {count > 5 && (
                            <div className="w-6 h-6 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center -ml-2">
                              <span className="text-[9px] font-bold text-gray-600">+{count - 5}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Option */}
          {poll.settings.allowAddOptions && !readonly && (
            <div className="flex items-center bg-gray-50 rounded-xl p-2 border border-gray-100 mb-6 focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
              <input 
                type="text"
                placeholder="Thêm lựa chọn mới..."
                className="flex-1 bg-transparent border-none text-sm px-3 py-2 focus:outline-none"
                value={newOptionText}
                onChange={(e) => setNewOptionText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddOption()}
              />
              <button 
                onClick={handleAddOption}
                disabled={isAddingOption || !newOptionText.trim()}
                className={`p-2 rounded-lg transition-colors ${newOptionText.trim() ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-400'}`}
              >
                {isAddingOption ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <PlusIcon className="w-5 h-5" />
                )}
              </button>
            </div>
          )}

          {/* Admin Action: Close Poll */}
          {isCreator && !readonly && (
            <button 
              onClick={handleClosePoll}
              className="w-full mt-2 py-3 rounded-xl border border-red-200 bg-red-50 text-red-600 font-bold text-sm hover:bg-red-100 transition-colors"
            >
              Khóa bình chọn
            </button>
          )}
        </div>

        {/* Footer actions */}
        {!readonly && (
          <div className="p-4 border-t border-gray-100 bg-white">
            {selectedOptions.length > 0 && (
              <div className="flex justify-end mb-2">
                <button 
                  onClick={() => setSelectedOptions([])} 
                  className="text-[13px] font-bold text-red-500 hover:text-red-600"
                >
                  Bỏ chọn tất cả
                </button>
              </div>
            )}
            <button 
              onClick={handleVote}
              disabled={submitting || (selectedOptions.length === 0 && initialVotes.length === 0)}
              className={`w-full py-3.5 rounded-xl font-bold text-[15px] shadow-sm transition-all ${
                (selectedOptions.length > 0 || initialVotes.length > 0)
                  ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              {submitting ? (
                <div className="flex justify-center items-center">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Đang gửi...
                </div>
              ) : (
                selectedOptions.length === 0 && initialVotes.length > 0 ? "Gỡ bình chọn" : "Gửi bình chọn"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
