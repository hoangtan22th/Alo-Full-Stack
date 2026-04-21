"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  XMarkIcon,
  CheckIcon,
  NoSymbolIcon,
  UserGroupIcon,
  IdentificationIcon,
  ShieldCheckIcon,
  ChatBubbleBottomCenterTextIcon,
} from "@heroicons/react/24/outline";
import { groupService } from "@/services/groupService";
import { userService } from "@/services/userService";
import { socketService } from "@/services/socketService";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuthStore";

interface MemberApprovalModalProps {
  groupId: string;
  onClose: () => void;
}

export default function MemberApprovalModal({ groupId, onClose }: MemberApprovalModalProps) {
  const [loading, setLoading] = useState(true);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [isApprovalRequired, setIsApprovalRequired] = useState(false);
  const [isQuestionEnabled, setIsQuestionEnabled] = useState(false);
  const [membershipQuestion, setMembershipQuestion] = useState("");
  const { userId: currentUserId } = useAuthStore();

  const fetchData = useCallback(async () => {
    if (!groupId) return;
    try {
      setLoading(true);
      // 1. Lấy thông tin group
      const groupData = await groupService.getGroupById(groupId);
      if (groupData) {
        setIsApprovalRequired(groupData.isApprovalRequired || false);
        setIsQuestionEnabled(groupData.isQuestionEnabled || false);
        setMembershipQuestion(groupData.membershipQuestion || "");
      }

      // 2. Lấy danh sách join requests
      const requests = await groupService.getJoinRequests(groupId);
      if (Array.isArray(requests)) {
        // 3. Gắn thông tin user
        const usersWithDetails = await Promise.all(
          requests.map(async (req: any) => {
            try {
              const userData = await userService.getUserById(req.userId);
              return {
                id: req.userId,
                name: userData?.fullName || "Người dùng",
                avatar: userData?.avatar || "",
                requestedAt: req.requestedAt,
                answer: req.answer || "",
              };
            } catch (err) {
              return {
                id: req.userId,
                name: "Người dùng",
                avatar: "",
                requestedAt: req.requestedAt,
                answer: req.answer || "",
              };
            }
          })
        );
        setPendingUsers(usersWithDetails);
      } else {
        setPendingUsers([]);
      }
    } catch (err) {
      console.error("Lỗi lấy thông tin duyệt thành viên:", err);
      toast.error("Không thể tải danh sách chờ duyệt");
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchData();

    const unsubJoin = socketService.onNewJoinRequest((data: { groupId: string }) => {
        if (String(data.groupId) === String(groupId)) {
            fetchData();
        }
    });

    const unsubConvo = socketService.onConversationUpdated((data: any) => {
        const updatedConvoId = data._id || data.conversationId || data.id;
        if (String(updatedConvoId) === String(groupId)) {
            fetchData();
        }
    });

    const unsubGroup = socketService.onGroupUpdated((data: any) => {
        const updatedConvoId = data._id || data.conversationId || data.id;
        if (String(updatedConvoId) === String(groupId)) {
            fetchData();
        }
    });

    return () => {
      unsubJoin();
      unsubConvo();
      unsubGroup();
    };
  }, [groupId, fetchData]);

  const handleToggleApproval = async (newValue: boolean) => {
    try {
      setIsApprovalRequired(newValue);
      await groupService.updateApprovalSetting(groupId, newValue);
      
      // Nếu tắt phê duyệt, tự động tắt luôn câu hỏi tham gia
      if (!newValue && isQuestionEnabled) {
        setIsQuestionEnabled(false);
        await groupService.updateGroupSettings(groupId, {
          isQuestionEnabled: false,
        });
      }
      
      toast.success(newValue ? "Đã bật chế độ phê duyệt" : "Đã tắt chế độ phê duyệt");
    } catch (error) {
      toast.error("Cập nhật thất bại");
      setIsApprovalRequired(!newValue);
    }
  };

  const handleToggleQuestion = async (newValue: boolean) => {
    if (!isApprovalRequired) return;
    try {
      setIsQuestionEnabled(newValue);
      await groupService.updateGroupSettings(groupId, {
        isQuestionEnabled: newValue,
      });
      toast.success(newValue ? "Đã bật câu hỏi tham gia" : "Đã tắt câu hỏi tham gia");
    } catch (error) {
      toast.error("Cập nhật thất bại");
      setIsQuestionEnabled(!newValue);
    }
  };

  const handleUpdateQuestion = async () => {
    try {
      await groupService.updateGroupSettings(groupId, {
        membershipQuestion,
      });
      toast.success("Đã lưu câu hỏi");
    } catch (error) {
      toast.error("Lưu câu hỏi thất bại");
    }
  };

  const handleApprove = async (userId: string) => {
    try {
      await groupService.approveJoinRequest(groupId, userId);
      toast.success("Đã phê duyệt thành viên");
      setPendingUsers(prev => prev.filter(u => u.id !== userId));
    } catch (error) {
      toast.error("Phê duyệt thất bại");
    }
  };

  const handleReject = async (userId: string) => {
    try {
      await groupService.rejectJoinRequest(groupId, userId);
      toast.success("Đã từ chối yêu cầu");
      setPendingUsers(prev => prev.filter(u => u.id !== userId));
    } catch (error) {
      toast.error("Từ chối thất bại");
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-xl font-black text-gray-900">Duyệt thành viên</h2>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">Quản lý quyền tham gia vào nhóm</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:shadow-sm rounded-full transition-all text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* Settings Section */}
          <div className="p-8 space-y-8">
            <div className="flex items-center justify-between p-6 bg-blue-50/50 rounded-3xl border border-blue-100/50">
              <div className="flex-1 pr-6">
                <div className="flex items-center gap-2 mb-1">
                    <ShieldCheckIcon className="w-5 h-5 text-blue-600" />
                    <h3 className="text-[16px] font-bold text-gray-900">Yêu cầu phê duyệt</h3>
                </div>
                <p className="text-[13px] text-gray-500 leading-relaxed font-medium">
                  Mọi người cần được trưởng nhóm hoặc phó nhóm phê duyệt để có thể tham gia trò chuyện.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={isApprovalRequired}
                  onChange={(e) => handleToggleApproval(e.target.checked)}
                />
                <div className="w-14 h-8 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600 shadow-inner"></div>
              </label>
            </div>

            <div className={`p-6 rounded-3xl border transition-all duration-300 ${isApprovalRequired ? 'bg-gray-50 border-gray-100' : 'bg-gray-50/30 border-gray-50 opacity-60'}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1 pr-6">
                    <div className="flex items-center gap-2 mb-1">
                        <IdentificationIcon className={`w-5 h-5 ${isApprovalRequired ? 'text-gray-700' : 'text-gray-300'}`} />
                        <h3 className={`text-[16px] font-bold ${isApprovalRequired ? 'text-gray-900' : 'text-gray-300'}`}>Câu hỏi tham gia</h3>
                    </div>
                  <p className={`text-[13px] font-medium ${isApprovalRequired ? 'text-gray-500' : 'text-gray-300'}`}>
                    Yêu cầu người tham gia trả lời một câu hỏi trước khi họ gửi yêu cầu tham gia nhóm.
                  </p>
                </div>
                <label className={`relative inline-flex items-center ${isApprovalRequired ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={isQuestionEnabled}
                    onChange={(e) => handleToggleQuestion(e.target.checked)}
                    disabled={!isApprovalRequired}
                  />
                  <div className={`w-14 h-8 rounded-full peer peer-focus:outline-none after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all shadow-inner ${isApprovalRequired ? 'bg-gray-200 peer-checked:bg-gray-800 peer-checked:after:translate-x-full' : 'bg-gray-100'}`}></div>
                </label>
              </div>

              {isQuestionEnabled && (
                <div className="mt-6 space-y-3 animate-in slide-in-from-top-2 duration-300">
                  <textarea
                    placeholder="Ví dụ: Tại sao bạn muốn tham gia nhóm này?"
                    className="w-full bg-white border border-gray-200 rounded-2xl p-4 text-[14px] font-medium text-gray-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none resize-none"
                    rows={3}
                    value={membershipQuestion}
                    onChange={(e) => setMembershipQuestion(e.target.value)}
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={handleUpdateQuestion}
                      className="px-6 py-2.5 bg-gray-900 text-white rounded-xl text-[12px] font-black uppercase tracking-wider hover:bg-black transition shadow-lg shadow-black/10"
                    >
                      Lưu câu hỏi
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="h-px bg-gray-100" />

          {/* Requests List section */}
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
               <h3 className="text-[13px] font-black text-gray-400 uppercase tracking-[0.2em]">
                Đang chờ duyệt ({pendingUsers.length})
              </h3>
            </div>

            {loading ? (
              <div className="flex flex-col items-center py-12">
                <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin mb-4" />
                <p className="text-sm font-bold text-gray-400 animate-pulse">Đang tải dữ liệu...</p>
              </div>
            ) : pendingUsers.length === 0 ? (
              <div className="flex flex-col items-center py-16 opacity-30">
                <UserGroupIcon className="w-16 h-16 mb-4 text-gray-300" />
                <p className="text-[17px] font-black text-gray-900 tracking-tight">Hiện tại không có yêu cầu nào</p>
                <p className="text-[13px] font-bold text-gray-500 mt-1 italic">Các yêu cầu mới sẽ xuất hiện tại đây</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingUsers.map((user) => (
                  <div
                    key={user.id}
                    className="group bg-white rounded-3xl border border-gray-100 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 gap-4"
                  >
                    <div className="flex items-center flex-1 min-w-0">
                      <div className="relative">
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm ring-1 ring-gray-100"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center border-2 border-white shadow-inner ring-1 ring-gray-100">
                            <span className="text-blue-600 font-black text-xl">
                              {user.name?.charAt(0)?.toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="ml-4 flex-1 min-w-0">
                        <h4 className="text-[16px] font-black text-gray-900 truncate tracking-tight">{user.name}</h4>
                        <p className="text-[12px] font-bold text-gray-400 mt-0.5 flex items-center gap-1.5 uppercase tracking-widest">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                            Đang chờ phê duyệt
                        </p>
                        
                        {user.answer && (
                          <div className="mt-3 bg-blue-50 p-4 rounded-2xl border border-blue-100/50 relative overflow-hidden group/answer">
                            <ChatBubbleBottomCenterTextIcon className="absolute -right-2 -bottom-2 w-12 h-12 text-blue-500/10 -rotate-12 transition-transform group-hover/answer:scale-125" />
                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1.5">Câu trả lời</p>
                            <p className="text-[14px] text-blue-900 font-medium italic leading-relaxed">
                              "{user.answer}"
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <button
                        onClick={() => handleReject(user.id)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gray-50 text-gray-500 hover:bg-red-50 hover:text-red-500 transition-all font-bold text-[13px]"
                      >
                        <NoSymbolIcon className="w-4 h-4" />
                        <span>TỪ CHỐI</span>
                      </button>
                      <button
                        onClick={() => handleApprove(user.id)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 transition-all font-black text-[13px] shadow-lg shadow-blue-500/20 active:translate-y-0.5"
                      >
                        <CheckIcon className="w-4 h-4" />
                        <span>DUYỆT</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
