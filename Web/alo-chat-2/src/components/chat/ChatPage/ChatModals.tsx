import React from "react";
import {
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowUturnLeftIcon,
  ArrowDownTrayIcon,
  ClipboardDocumentIcon,
  PaperAirplaneIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import ForwardMessageModal from "@/components/ui/ForwardMessageModal";
import FriendProfileModal from "@/components/ui/FriendProfileModal";
import { MessageDTO } from "@/services/messageService";
import StoreReportModal from "./StoreReportModal";
import ReportSelectionToolbar from "@/components/ui/report/ReportSelectionToolbar";
import { getMediaUrl } from "./utils";

interface ChatModalsProps {
  viewingReactions: any;
  setViewingReactions: (val: any) => void;
  EMOJI_MAP: any;
  userCache: any;
  activeAlbumIndex: any;
  setActiveAlbumIndex: (val: any) => void;
  messages: MessageDTO[];
  handleDownload: (url: string, filename: string) => void;
  forwardingMessage: MessageDTO | null;
  setForwardingMessage: (val: MessageDTO | null) => void;
  forwardingMessages: MessageDTO[];
  setForwardingMessages: (val: MessageDTO[]) => void;
  currentUser: any;
  showProfileModal: boolean;
  setShowProfileModal: (val: boolean) => void;
  otherUserId: string;
  relationStatus: string;
  fetchConversationInfo: () => void;
  showLeaveModal: boolean;
  setShowLeaveModal: (val: boolean) => void;
  leaveOptions: { isSilent: boolean; preventReinvite: boolean };
  setLeaveOptions: React.Dispatch<React.SetStateAction<{ isSilent: boolean; preventReinvite: boolean }>>;
  confirmLeaveGroup: () => void;
  groupInfoModal: any;
  setGroupInfoModal: (val: any) => void;
  joinGroupModal: any;
  setJoinGroupModal: (val: any) => void;
  joinGroupAnswer: string;
  setJoinGroupAnswer: (val: string) => void;
  joiningGroup: boolean;
  handleJoinGroup: () => void;
  isMultiSelectMode: boolean;
  selectedMessageIds: Set<string>;
  clearMessageSelection: () => void;
  handleBulkCopy: () => void;
  handleBulkForward: () => void;
  handleBulkRevoke: () => void;
  handleBulkDeleteForMe: () => void;
  canBulkRevoke: boolean;
}

export default function ChatModals({
  viewingReactions,
  setViewingReactions,
  EMOJI_MAP,
  userCache,
  activeAlbumIndex,
  setActiveAlbumIndex,
  messages,
  handleDownload,
  forwardingMessage,
  setForwardingMessage,
  forwardingMessages,
  setForwardingMessages,
  currentUser,
  showProfileModal,
  setShowProfileModal,
  otherUserId,
  relationStatus,
  fetchConversationInfo,
  showLeaveModal,
  setShowLeaveModal,
  leaveOptions,
  setLeaveOptions,
  confirmLeaveGroup,
  groupInfoModal,
  setGroupInfoModal,
  joinGroupModal,
  setJoinGroupModal,
  joinGroupAnswer,
  setJoinGroupAnswer,
  joiningGroup,
  handleJoinGroup,
  isMultiSelectMode,
  selectedMessageIds,
  clearMessageSelection,
  handleBulkCopy,
  handleBulkForward,
  handleBulkRevoke,
  handleBulkDeleteForMe,
  canBulkRevoke,
}: ChatModalsProps) {
  return (
    <>
      {/* Reaction Modal */}
      {viewingReactions && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setViewingReactions(null)}
          />
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden relative animate-in fade-in zoom-in duration-200 flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-lg">Cảm xúc tin nhắn</h3>
              <button
                onClick={() => setViewingReactions(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition text-gray-500"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="flex flex-1 overflow-hidden">
              {/* Left Column: Emoji Tabs */}
              {(() => {
                const rList = viewingReactions.reactions;
                const totalCount = rList.reduce(
                  (acc: number, r: any) => acc + (r.count || 1),
                  0,
                );
                const groupedCount = rList.reduce(
                  (acc: Record<string, number>, r: any) => {
                    acc[r.emoji] = (acc[r.emoji] || 0) + (r.count || 1);
                    return acc;
                  },
                  {} as Record<string, number>,
                );
                const sortedGrouped = (
                  Object.entries(groupedCount) as [string, number][]
                ).sort((a, b) => b[1] - a[1]);

                // Right Column Users
                const activeFilters =
                  viewingReactions.activeTab === "all"
                    ? rList
                    : rList.filter(
                      (r: any) => r.emoji === viewingReactions.activeTab,
                    );

                // Group by user for the right column
                const userEmoteMap = activeFilters.reduce(
                  (acc: any, r: any) => {
                    const uid = String(r.userId);
                    if (!acc[uid]) acc[uid] = { total: 0, emotes: [] };
                    acc[uid].total += r.count || 1;

                    // Group similar emojis if user clicked multiple times
                    const existingEmote = acc[uid].emotes.find(
                      (e: any) => e.emoji === r.emoji,
                    );
                    if (existingEmote)
                      existingEmote.count += r.count || 1;
                    else
                      acc[uid].emotes.push({
                        emoji: r.emoji,
                        count: r.count || 1,
                      });

                    return acc;
                  },
                  {} as Record<
                    string,
                    {
                      total: number;
                      emotes: { emoji: string; count: number }[];
                    }
                  >,
                );

                const sortedUsers = (
                  Object.entries(userEmoteMap) as [string, any][]
                ).sort((a, b) => b[1].total - a[1].total);

                return (
                  <>
                    <div className="w-1/3 border-r border-gray-100 p-2 overflow-y-auto bg-white max-h-[60vh]">
                      <button
                        onClick={() =>
                          setViewingReactions({
                            ...viewingReactions,
                            activeTab: "all",
                          })
                        }
                        className={`w-full flex items-center justify-between p-3 rounded-2xl transition mb-1 ${viewingReactions.activeTab === "all" ? "bg-gray-100" : "hover:bg-gray-50"}`}
                      >
                        <span className="font-semibold text-sm">
                          Tất cả
                        </span>
                        <span className="text-gray-500 text-sm font-medium">
                          {totalCount}
                        </span>
                      </button>
                      {sortedGrouped.map(([emojiKey, count]) => (
                        <button
                          key={emojiKey}
                          onClick={() =>
                            setViewingReactions({
                              ...viewingReactions,
                              activeTab: emojiKey,
                            })
                          }
                          className={`w-full flex items-center justify-between p-3 rounded-2xl transition mb-1 ${viewingReactions.activeTab === emojiKey ? "bg-gray-100" : "hover:bg-gray-50"}`}
                        >
                          <span className="text-2xl">
                            {EMOJI_MAP[emojiKey] || emojiKey}
                          </span>
                          <span className="text-gray-500 text-sm font-medium">
                            {count}
                          </span>
                        </button>
                      ))}
                    </div>

                    <div className="w-2/3 p-2 overflow-y-auto bg-[#F9FAFB] max-h-[60vh]">
                      {sortedUsers.map(([uid, uData]) => {
                        const uInfo = userCache[uid] || {
                          name: `User #${uid.substring(0, 4)}`,
                          avatar: "",
                        };
                        return (
                          <div
                            key={uid}
                            className="flex items-center gap-3 p-3 mb-1 bg-white rounded-2xl shadow-sm border border-gray-50 hover:shadow-md transition"
                          >
                            <div className="relative">
                              {uInfo.avatar ? (
                                <img
                                  src={getMediaUrl(uInfo.avatar)}
                                  alt={uInfo.name}
                                  className="w-10 h-10 rounded-full object-cover shadow-sm bg-gray-100"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm shadow-sm uppercase">
                                  {uInfo.name.charAt(0)}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-[14px] truncate text-gray-900">
                                {uInfo.name}
                              </p>
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {uData.emotes.map(
                                  (em: any, idx: number) => (
                                    <div
                                      key={idx}
                                      className="flex items-center text-xs bg-gray-50 border border-gray-100 rounded-lg px-2 py-0.5"
                                    >
                                      <span className="text-[14px] mr-1">
                                        {EMOJI_MAP[em.emoji] || em.emoji}
                                      </span>
                                      {em.count > 1 && (
                                        <span className="font-black text-gray-600">
                                          x{em.count}
                                        </span>
                                      )}
                                    </div>
                                  ),
                                )}
                              </div>
                            </div>
                            <div className="text-right flex flex-col justify-center">
                              <span className="text-[20px] font-black text-gray-200 leading-none">
                                {uData.total}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                      {sortedUsers.length === 0 && (
                        <div className="h-full flex items-center justify-center text-gray-400 font-medium text-sm">
                          Không có cảm xúc nào
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ALBUM PREVIEW MODAL */}
      {activeAlbumIndex && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 animate-in fade-in duration-200">
          <button
            className="absolute top-6 right-6 p-3 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition z-10"
            onClick={() => setActiveAlbumIndex(null)}
          >
            <XMarkIcon className="w-8 h-8" />
          </button>

          {(() => {
            const msg = messages.find(
              (m) => m._id === activeAlbumIndex.messageId,
            );
            if (!msg) return null;

            const images = msg.metadata?.imageGroup || [
              { url: msg.content, isRevoked: msg.isRevoked },
            ];
            const currentImg = images[activeAlbumIndex.index];

            const next = () => {
              const nextIdx = (activeAlbumIndex.index + 1) % images.length;
              setActiveAlbumIndex({ ...activeAlbumIndex, index: nextIdx });
            };
            const prev = () => {
              const prevIdx =
                (activeAlbumIndex.index - 1 + images.length) %
                images.length;
              setActiveAlbumIndex({ ...activeAlbumIndex, index: prevIdx });
            };

            return (
              <div className="relative w-full h-full flex items-center justify-center p-4">
                {/* Navigation Buttons */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        prev();
                      }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 p-4 text-white/50 hover:text-white transition"
                    >
                      <ChevronLeftIcon className="w-12 h-12" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        next();
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-4 text-white/50 hover:text-white transition"
                    >
                      <ChevronRightIcon className="w-12 h-12" />
                    </button>
                  </>
                )}

                <div className="max-w-4xl max-h-[85vh] flex flex-col items-center">
                  {currentImg?.isRevoked ? (
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <ArrowUturnLeftIcon className="w-20 h-20 mb-4 opacity-20" />
                      <p className="text-xl font-bold">
                        Hình ảnh này đã được thu hồi
                      </p>
                    </div>
                  ) : (
                    currentImg && (
                      <img
                        src={getMediaUrl(currentImg.url)}
                        className="max-w-full max-h-full object-contain shadow-2xl rounded-sm"
                        alt="preview"
                      />
                    )
                  )}

                  {currentImg && (
                    <div className="mt-6 flex flex-col items-center gap-2">
                      <p className="text-white/60 text-sm font-medium">
                        {activeAlbumIndex.index + 1} / {images.length}
                      </p>
                      {!currentImg.isRevoked && (
                        <button
                          onClick={() =>
                            handleDownload(
                              getMediaUrl(currentImg.url),
                              currentImg.fileName || "image.png",
                            )
                          }
                          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full text-sm font-bold transition"
                        >
                          <ArrowDownTrayIcon className="w-4 h-4" />
                          Lưu về máy
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Forward Message Modal */}
      {forwardingMessage && (
        <ForwardMessageModal
          isOpen={true}
          onClose={() => setForwardingMessage(null)}
          messages={[forwardingMessage]}
          currentUser={currentUser}
        />
      )}

      {/* Friend Profile Modal */}
      {showProfileModal && (
        <FriendProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          userId={otherUserId}
          relationStatus={relationStatus}
          onActionSuccess={() => fetchConversationInfo()}
        />
      )}

      {/* Leave Group Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-gray-900 mb-2">
              Rời khỏi nhóm?
            </h3>
            <p className="text-gray-500 text-sm mb-6">
              Bạn sẽ không còn nhận được tin nhắn từ nhóm này nữa.
            </p>

            <div className="space-y-4 mb-8">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-300 transition-all checked:border-blue-500 checked:bg-blue-500 hover:border-blue-400"
                    checked={leaveOptions.isSilent}
                    onChange={(e) =>
                      setLeaveOptions((prev) => ({
                        ...prev,
                        isSilent: e.target.checked,
                      }))
                    }
                  />
                  <svg
                    className="absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none left-0.75"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <span className="text-[14px] font-bold text-gray-700 group-hover:text-black transition-colors">
                  Rời nhóm trong im lặng
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-300 transition-all checked:border-red-500 checked:bg-red-500 hover:border-red-400"
                    checked={leaveOptions.preventReinvite}
                    onChange={(e) =>
                      setLeaveOptions((prev) => ({
                        ...prev,
                        preventReinvite: e.target.checked,
                      }))
                    }
                  />
                  <svg
                    className="absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none left-0.75"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <span className="text-[14px] font-bold text-gray-700 group-hover:text-black transition-colors">
                  Chặn mời vào lại nhóm
                </span>
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowLeaveModal(false)}
                className="flex-1 py-3 rounded-xl font-black text-gray-500 hover:bg-gray-100 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={confirmLeaveGroup}
                className="flex-1 py-3 rounded-xl font-black bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg shadow-red-200"
              >
                Rời nhóm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Group Info Modal (Zalo Style) */}
      {groupInfoModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-gray-100">
            {/* Modal Header */}
            <div className="px-6 py-5 flex items-center justify-between border-b border-gray-50">
              <h3 className="text-base font-black text-gray-900 tracking-tight">Thông tin nhóm</h3>
              <button
                onClick={() => setGroupInfoModal(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-8 flex flex-col items-center text-center">
              {/* Stacked Avatars */}
              <div className="relative mb-6 flex justify-center">
                <div className="relative w-24 h-24">
                  <img
                    src={groupInfoModal.groupAvatar ? getMediaUrl(groupInfoModal.groupAvatar) : "/avt-mac-dinh.jpg"}
                    className="w-24 h-24 rounded-[32px] object-cover ring-4 ring-white shadow-xl relative z-10"
                  />
                  <div className="absolute -right-2 -bottom-2 w-16 h-16 rounded-[24px] bg-gray-100 ring-4 ring-white shadow-lg overflow-hidden opacity-40">
                    <img
                      src={groupInfoModal.groupAvatar ? getMediaUrl(groupInfoModal.groupAvatar) : "/avt-mac-dinh.jpg"}
                      className="w-full h-full object-cover grayscale"
                    />
                  </div>
                </div>
              </div>

              <h2 className="text-xl font-black text-gray-900 mb-2 px-4 leading-tight">
                {groupInfoModal.name}
              </h2>

              <div className="flex items-center gap-2 text-sm text-gray-500 font-bold mb-8">
                <span>{groupInfoModal.members?.length || 0} thành viên</span>
                <span className="w-1 h-1 rounded-full bg-gray-300" />
                <span>Tạo bởi <span className="text-black">{groupInfoModal.members?.find((m: any) => m.role === 'LEADER')?.name || 'Quản trị viên'}</span></span>
              </div>

              <div className="w-full h-[1px] bg-gray-50 mb-8" />

              <p className="text-sm text-gray-600 font-medium leading-relaxed mb-8 px-2">
                Bạn đang ở phòng chờ. Hãy tham gia chat để cùng trò chuyện với mọi người trong nhóm.
              </p>

              {/* Small Member Avatars List */}
              <div className="flex -space-x-3 mb-4">
                {groupInfoModal.members?.slice(0, 5).map((member: any, idx: number) => (
                  <div key={idx} className="w-10 h-10 rounded-2xl ring-4 ring-white overflow-hidden bg-gray-100 shadow-sm">
                    <img
                      src={member.avatar ? getMediaUrl(member.avatar) : "/avt-mac-dinh.jpg"}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
                {groupInfoModal.members?.length > 5 && (
                  <div className="w-10 h-10 rounded-2xl ring-4 ring-white bg-gray-900 flex items-center justify-center text-[10px] text-white font-black z-10">
                    +{groupInfoModal.members.length - 5}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-gray-50/50 flex gap-3">
              <button
                onClick={() => setGroupInfoModal(null)}
                className="flex-1 py-4 rounded-[20px] font-black text-gray-900 bg-gray-100 hover:bg-gray-200 transition-all border border-gray-200 shadow-sm active:scale-95"
              >
                Đóng
              </button>
              <button
                onClick={handleJoinGroup}
                className="flex-1 py-4 rounded-[20px] font-black bg-black text-white hover:bg-gray-800 transition-all shadow-xl shadow-black/10 active:scale-95"
              >
                Tham gia
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Join Request Modal (Approval/Question) */}
      {joinGroupModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] w-full max-w-sm p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="mb-8">
              <h3 className="text-xl font-black text-gray-900 mb-3">Yêu cầu tham gia</h3>
              <p className="text-sm text-gray-500 font-medium leading-relaxed">
                {joinGroupModal.question
                  ? "Nhóm này yêu cầu bạn trả lời câu hỏi trước khi tham gia."
                  : "Yêu cầu của bạn sẽ được gửi đến quản trị viên để xét duyệt."}
              </p>
            </div>

            {joinGroupModal.question && (
              <div className="mb-8">
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">
                  Câu hỏi: {joinGroupModal.question}
                </label>
                <textarea
                  value={joinGroupAnswer}
                  onChange={(e) => setJoinGroupAnswer(e.target.value)}
                  placeholder="Nhập câu trả lời của bạn..."
                  className="w-full p-5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm focus:ring-0 focus:border-black transition-all resize-none h-32"
                />
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setJoinGroupModal(null); setJoinGroupAnswer(""); }}
                className="flex-1 py-4 rounded-[20px] font-black text-gray-500 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleJoinGroup}
                disabled={joiningGroup}
                className="flex-1 py-4 rounded-[20px] font-black bg-black text-white hover:bg-gray-800 transition-all disabled:opacity-50"
              >
                {joiningGroup ? "Đang gửi..." : "Gửi yêu cầu"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Forward Modals */}
      {(forwardingMessage || forwardingMessages.length > 0) && (
        <ForwardMessageModal
          isOpen={!!forwardingMessage || forwardingMessages.length > 0}
          onClose={() => {
            setForwardingMessage(null);
            setForwardingMessages([]);
            if (isMultiSelectMode) {
              clearMessageSelection();
            }
          }}
          messages={forwardingMessage ? [forwardingMessage] : forwardingMessages}
          currentUser={currentUser}
        />
      )}

      {/* Global Report Selection Toolbar */}
      <ReportSelectionToolbar />
      {/* Global store-driven ReportModal for 1-1 user reports */}
      <StoreReportModal />

      {/* Multi-Select Toolbar */}
      {isMultiSelectMode && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[110] animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-white/90 backdrop-blur-xl border border-gray-100 shadow-2xl rounded-[32px] py-3.5 px-7 flex items-center gap-8 ring-1 ring-black/5">
            <div className="flex flex-col">
              <span className={`text-[13px] font-black ${selectedMessageIds.size > 30 ? "text-red-500" : "text-black"}`}>
                Đã chọn {selectedMessageIds.size}
              </span>
              <span className="text-[10px] text-gray-500 font-bold">
                Tối đa 30 tin nhắn
              </span>
            </div>

            <div className="w-[1px] h-8 bg-gray-100" />

            <div className="flex items-center gap-3">
              <button
                onClick={handleBulkCopy}
                disabled={selectedMessageIds.size === 0 || selectedMessageIds.size > 30}
                className="flex flex-col items-center gap-1 p-2 min-w-[72px] hover:bg-gray-50 rounded-2xl transition group disabled:opacity-30"
              >
                <ClipboardDocumentIcon className="w-5 h-5 text-gray-700 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-bold text-gray-600">Sao chép</span>
              </button>

              <button
                onClick={handleBulkForward}
                disabled={selectedMessageIds.size === 0 || selectedMessageIds.size > 30}
                className="flex flex-col items-center gap-1 p-2 min-w-[72px] hover:bg-gray-50 rounded-2xl transition group disabled:opacity-30"
              >
                <PaperAirplaneIcon className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-bold text-gray-600">Chia sẻ</span>
              </button>

              <button
                onClick={handleBulkRevoke}
                disabled={!canBulkRevoke || selectedMessageIds.size > 30}
                className={`flex flex-col items-center gap-1 p-2 min-w-[72px] hover:bg-orange-50 rounded-2xl transition group ${!canBulkRevoke ? "opacity-30 grayscale cursor-not-allowed" : ""}`}
              >
                <ArrowUturnLeftIcon className="w-5 h-5 text-orange-500 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-bold text-gray-600">Thu hồi</span>
              </button>

              <button
                onClick={handleBulkDeleteForMe}
                disabled={selectedMessageIds.size === 0 || selectedMessageIds.size > 30}
                className="flex flex-col items-center gap-1 p-2 min-w-[72px] hover:bg-red-50 rounded-2xl transition group disabled:opacity-30"
              >
                <TrashIcon className="w-5 h-5 text-red-500 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-bold text-gray-600">Xóa</span>
              </button>
            </div>

            <div className="w-[1px] h-8 bg-gray-100" />

            <button
              onClick={() => {
                clearMessageSelection();
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-2xl text-[13px] font-black transition active:scale-95"
            >
              Hủy
            </button>
          </div>
        </div>
      )}
    </>
  );
}
