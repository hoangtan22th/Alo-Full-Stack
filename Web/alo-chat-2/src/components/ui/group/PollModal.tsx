"use client";
import React, { useState, useEffect } from "react";
import {
  XMarkIcon,
  PlusIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import { pollService, PollDTO } from "@/services/pollService";
import { socketService } from "@/services/socketService";
import { toast } from "sonner";

interface PollModalProps {
  conversationId: string;
  canCreate?: boolean;
  onClose: () => void;
  onOpenDetails?: (pollId: string) => void;
}

export default function PollModal({ conversationId, canCreate = true, onClose, onOpenDetails }: PollModalProps) {
  const [polls, setPolls] = useState<PollDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [displayCount, setDisplayCount] = useState(5);
  
  // Create Poll State
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  
  // Advanced Settings State
  const [allowMultipleAnswers, setAllowMultipleAnswers] = useState(false);
  const [allowAddOptions, setAllowAddOptions] = useState(true);
  const [hideResultsUntilVoted, setHideResultsUntilVoted] = useState(false);
  const [hideVoters, setHideVoters] = useState(false);
  const [pinToTop, setPinToTop] = useState(false);
  const [expiresAtStr, setExpiresAtStr] = useState("");

  useEffect(() => {
    fetchPolls();
    
    const unsub = socketService.onPollUpdated((data) => {
      if (String(data.conversationId) === String(conversationId)) {
        fetchPolls();
      }
    });

    const unsubMsg = socketService.onMessageReceived((data) => {
      const newMsg = data.message || data;
      if (String(newMsg.conversationId || newMsg.roomId) === String(conversationId) && newMsg.type === "poll") {
        fetchPolls();
      }
    });

    return () => {
      unsub();
      unsubMsg();
    };
  }, [conversationId]);

  const fetchPolls = async () => {
    try {
      setLoading(true);
      const data = await pollService.getPollsByConversation(conversationId);
      
      // Kiểm tra data hợp lệ trước khi sắp xếp
      if (Array.isArray(data)) {
        const sortedData = [...data].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setPolls(sortedData);
      } else {
        setPolls([]);
      }
    } catch (err) {
      console.error(err);
      toast.error("Không thể tải danh sách bình chọn");
    } finally {
      setLoading(false);
    }
  };

  const handleAddOption = () => {
    setOptions([...options, ""]);
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleCreatePoll = async () => {
    if (!question.trim()) return toast.error("Vui lòng nhập câu hỏi");
    const validOptions = options.filter(o => o.trim() !== "");
    if (validOptions.length < 2) return toast.error("Cần ít nhất 2 lựa chọn");

    try {
      const payload = {
        conversationId,
        question,
        options: validOptions,
        settings: {
          allowMultipleAnswers,
          allowAddOptions,
          hideResultsUntilVoted,
          hideVoters,
          pinToTop
        },
        expiresAt: expiresAtStr ? new Date(expiresAtStr).toISOString() : null
      };
      const newPoll = await pollService.createPoll(payload);
      if (newPoll) {
        toast.success("Đã tạo bình chọn mới");
        setShowCreate(false);
        setQuestion("");
        setOptions(["", ""]);
        fetchPolls();
      }
    } catch (err) {
      toast.error("Lỗi khi tạo bình chọn");
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-lg font-black text-gray-900">Bình chọn</h2>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Thăm dò ý kiến thành viên</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:shadow-sm rounded-full transition-all text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
          {showCreate ? (
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Câu hỏi</label>
                <textarea 
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Bạn muốn hỏi gì?"
                  className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-black/10 transition resize-none"
                  rows={3}
                />
              </div>

              <div>
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Các lựa chọn</label>
                <div className="space-y-2">
                  {options.map((opt, idx) => (
                    <input 
                      key={idx}
                      value={opt}
                      onChange={(e) => handleOptionChange(idx, e.target.value)}
                      placeholder={`Lựa chọn ${idx + 1}`}
                      className="w-full bg-gray-50 border-none rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-black/10 transition"
                    />
                  ))}
                  <button 
                    onClick={handleAddOption}
                    className="text-black font-black uppercase tracking-tighter hover:translate-x-1 transition text-[11px] flex items-center gap-2 mt-2 bg-gray-100 px-3 py-1.5 rounded-lg w-fit"
                  >
                    <PlusIcon className="w-4 h-4" />
                    Thêm lựa chọn
                  </button>
                </div>
              </div>

              {/* Tùy chọn nâng cao */}
              <div>
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3 block">Cài đặt nâng cao</label>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center justify-center">
                      <input type="checkbox" checked={allowMultipleAnswers} onChange={e => setAllowMultipleAnswers(e.target.checked)} className="peer sr-only" />
                      <div className="w-5 h-5 border-2 border-gray-300 rounded-md peer-checked:bg-blue-600 peer-checked:border-blue-600 transition" />
                      <svg className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                    <span className="text-[13px] font-semibold text-gray-700 group-hover:text-gray-900 transition">Cho phép chọn nhiều đáp án</span>
                  </label>
                  
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center justify-center">
                      <input type="checkbox" checked={allowAddOptions} onChange={e => setAllowAddOptions(e.target.checked)} className="peer sr-only" />
                      <div className="w-5 h-5 border-2 border-gray-300 rounded-md peer-checked:bg-blue-600 peer-checked:border-blue-600 transition" />
                      <svg className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                    <span className="text-[13px] font-semibold text-gray-700 group-hover:text-gray-900 transition">Cho phép thành viên thêm lựa chọn</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center justify-center">
                      <input type="checkbox" checked={hideVoters} onChange={e => setHideVoters(e.target.checked)} className="peer sr-only" />
                      <div className="w-5 h-5 border-2 border-gray-300 rounded-md peer-checked:bg-blue-600 peer-checked:border-blue-600 transition" />
                      <svg className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                    <span className="text-[13px] font-semibold text-gray-700 group-hover:text-gray-900 transition">Ẩn danh người bình chọn</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center justify-center">
                      <input type="checkbox" checked={hideResultsUntilVoted} onChange={e => setHideResultsUntilVoted(e.target.checked)} className="peer sr-only" />
                      <div className="w-5 h-5 border-2 border-gray-300 rounded-md peer-checked:bg-blue-600 peer-checked:border-blue-600 transition" />
                      <svg className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                    <span className="text-[13px] font-semibold text-gray-700 group-hover:text-gray-900 transition">Ẩn kết quả trước khi bình chọn</span>
                  </label>

                  <div className="pt-2">
                    <label className="text-[13px] font-semibold text-gray-700 mb-1.5 block">Hết hạn (Tùy chọn)</label>
                    <input 
                      type="datetime-local" 
                      value={expiresAtStr}
                      onChange={e => setExpiresAtStr(e.target.value)}
                      className="w-full bg-gray-50 border-none rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 transition"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-3 rounded-xl font-bold text-[13px] text-gray-500 hover:bg-gray-100 transition"
                >
                  HỦY
                </button>
                <button 
                  onClick={handleCreatePoll}
                  className="flex-1 py-3 rounded-xl font-bold text-[13px] bg-black text-white shadow-lg hover:shadow-black/20 hover:-translate-y-0.5 active:translate-y-0 transition"
                >
                  TẠO BÌNH CHỌN
                </button>
              </div>
            </div>
          ) : (
            <>
              {canCreate && (
                <button 
                  onClick={() => setShowCreate(true)}
                  className="w-full mb-6 py-4 flex items-center justify-center gap-3 bg-gray-50 text-black rounded-2xl border-2 border-dashed border-gray-200 hover:bg-gray-100 hover:border-black transition group"
                >
                  <PlusIcon className="w-5 h-5 group-hover:scale-110 transition" />
                  <span className="text-[14px] font-black uppercase tracking-tight">Tạo cuộc bình chọn mới</span>
                </button>
              )}

              <div className="space-y-4">
                {loading ? (
                  <div className="flex flex-col items-center py-10">
                    <div className="w-8 h-8 border-4 border-gray-200 border-t-black rounded-full animate-spin mb-3" />
                  </div>
                ) : polls.length > 0 ? (
                  <>
                    {polls.slice(0, displayCount).map((poll) => (
                      <div 
                        key={poll._id} 
                        onClick={() => {
                          onClose();
                          if (onOpenDetails && poll._id) onOpenDetails(poll._id);
                        }}
                        className="hover:border-black/20 transition cursor-pointer group relative bg-gray-50 p-4 rounded-2xl border border-gray-100"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="group-hover:text-black transition text-[14px] font-black text-gray-900 pr-4">{poll.question}</h3>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase shrink-0 ml-3 ${poll.status === 'OPEN' ? 'bg-black text-white' : 'bg-gray-100 text-gray-400'}`}>
                            {poll.status === 'OPEN' ? 'Đang mở' : 'Đã đóng'}
                          </span>
                        </div>
                        <p className="text-[11px] font-medium text-gray-400">
                          {poll.options.length} lựa chọn • {new Date(poll.createdAt).toLocaleDateString('vi-VN')}
                        </p>
                      </div>
                    ))}
                    {displayCount < polls.length && (
                      <button 
                        onClick={() => setDisplayCount(prev => prev + 5)}
                        className="w-full py-3 mt-2 text-[13px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition"
                      >
                        Xem thêm ({polls.length - displayCount} bình chọn cũ hơn)
                      </button>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center py-10 opacity-40">
                    <ChartBarIcon className="w-12 h-12 mb-3" />
                    <p className="text-sm font-bold italic">Chưa có cuộc bình chọn nào</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
