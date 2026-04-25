import React from "react";
import {
  PhoneIcon,
  VideoCameraIcon,
  MagnifyingGlassIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import ChatSummaryButton from "@/components/ui/chatbot/ChatSummaryButton";
import GroupCallSelector from "@/components/ui/call/GroupCallSelector";
import PollDetailsModal from "@/components/ui/group/PollDetailsModal";
import { MessageDTO } from "@/services/messageService";

interface ChatHeaderProps {
  conversationInfo: any;
  isStranger: boolean;
  relationStatus: string;
  pinnedMessages: MessageDTO[];
  showInfoPanel: boolean;
  setShowInfoPanel: (val: boolean) => void;
  handleStartCall: (isVideo: boolean) => void;
  handlePinMessage: (msg: any) => void;
  getSenderDisplayName: (id: string, msg?: any) => string;
  formatTime: (iso: string) => string;
  getMediaUrl: (url: string | undefined) => string;
  setShowProfileModal: (val: boolean) => void;
  conversationId: string;
  myId: string;
  messages: MessageDTO[];
  userCache: any;
  confirmGroupCall: (members: string[]) => void;
  showCallMemberSelector: { isVideo: boolean } | null;
  setShowCallMemberSelector: (val: { isVideo: boolean } | null) => void;
  activePollId: string | null;
  setActivePollId: (id: string | null) => void;
  showPinnedModal: boolean;
  setShowPinnedModal: (val: boolean) => void;
  BOT_ID: string;
}

export default function ChatHeader({
  conversationInfo,
  isStranger,
  relationStatus,
  pinnedMessages,
  showInfoPanel,
  setShowInfoPanel,
  handleStartCall,
  handlePinMessage,
  getSenderDisplayName,
  formatTime,
  getMediaUrl,
  setShowProfileModal,
  conversationId,
  myId,
  messages,
  userCache,
  confirmGroupCall,
  showCallMemberSelector,
  setShowCallMemberSelector,
  activePollId,
  setActivePollId,
  showPinnedModal,
  setShowPinnedModal,
  BOT_ID,
}: ChatHeaderProps) {
  return (
    <>
      <div className="h-[72px] px-6 flex items-center justify-between border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <div className="relative">
            {conversationInfo?.displayAvatar ? (
              <img
                src={getMediaUrl(conversationInfo.displayAvatar)}
                alt={conversationInfo?.displayName || conversationInfo?.name}
                className="w-10 h-10 rounded-full object-cover shadow-sm ring-2 ring-gray-50"
              />
            ) : conversationInfo?.isGroup ? (
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-[15px]">
                {(
                  conversationInfo?.displayName ||
                  conversationInfo?.name ||
                  "?"
                )
                  .charAt(0)
                  .toUpperCase()}
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-[15px]">
                {(
                  conversationInfo?.displayName ||
                  conversationInfo?.name ||
                  "?"
                )
                  .charAt(0)
                  .toUpperCase()}
              </div>
            )}
            {/* Online dot — chỉ hiện với chat 1-1 */}
            {!conversationInfo?.isGroup && (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
            )}
          </div>

          {/* Tên & trạng thái */}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[16px] font-black tracking-tight">
                {conversationInfo?.displayName ||
                  conversationInfo?.name ||
                  "Đang tải..."}
              </h2>
              {isStranger && (
                <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-black uppercase rounded-md tracking-wider">
                  Người lạ
                </span>
              )}
            </div>
            <p className="text-[12px] font-bold text-gray-400 mt-0.5">
              {conversationInfo?.isGroup
                ? `${conversationInfo?.members?.length ?? ""} thành viên`
                : "Đang hoạt động"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-gray-400">
          <button
            onClick={() => handleStartCall(false)}
            className="hover:text-black transition"
          >
            <PhoneIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => handleStartCall(true)}
            className="hover:text-black transition"
          >
            <VideoCameraIcon className="w-5 h-5" />
          </button>

          <button className="hover:text-black transition">
            <MagnifyingGlassIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowInfoPanel(!showInfoPanel)}
            className={`transition ${showInfoPanel ? "text-black" : "hover:text-gray-600"}`}
          >
            <InformationCircleIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stranger Warning Banner */}
      {isStranger && (
        <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-between animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-500 shrink-0">
              <ExclamationTriangleIcon className="w-4 h-4" />
            </div>
            <p className="text-[13px] font-bold text-red-800">
              Hãy cẩn thận khi nhắn tin với người lạ.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (relationStatus === "NOT_FRIEND")
                  setShowProfileModal(true);
              }}
              disabled={
                relationStatus === "I_SENT_REQUEST" ||
                relationStatus === "YOU_SENT_REQUEST"
              }
              className={`px-3 py-1.5 text-white text-[11px] font-black rounded-lg transition active:scale-95 shadow-sm ${relationStatus === "I_SENT_REQUEST" ||
                  relationStatus === "YOU_SENT_REQUEST"
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-red-600 hover:bg-red-700"
                }`}
            >
              {relationStatus === "I_SENT_REQUEST" ||
                relationStatus === "YOU_SENT_REQUEST"
                ? "Đã gửi yêu cầu"
                : "Kết bạn"}
            </button>
            <button className="px-3 py-1.5 bg-white text-gray-700 text-[11px] font-black rounded-lg border border-gray-100 hover:bg-gray-50 transition active:scale-95 shadow-sm">
              Chặn
            </button>
            <button className="px-3 py-1.5 bg-white text-gray-700 text-[11px] font-black rounded-lg border border-gray-100 hover:bg-red-50 hover:text-red-600 transition active:scale-95 shadow-sm">
              Báo xấu
            </button>
          </div>
        </div>
      )}

      {/* Pinned Messages (nếu có) */}
      {pinnedMessages.length === 1 && (
        <div className="px-6 pt-3 pb-1">
          <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2 shadow-sm">
            <MapPinIcon className="w-5 h-5 text-yellow-500" />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-bold text-yellow-800 truncate">
                {pinnedMessages[0].type === "text"
                  ? pinnedMessages[0].content
                  : pinnedMessages[0].type === "file"
                    ? pinnedMessages[0].metadata?.fileName ||
                    "Tệp đính kèm"
                    : pinnedMessages[0].type === "image"
                      ? "[Ảnh]"
                      : "[Tin nhắn hệ thống]"}
              </div>
              <div className="text-[11px] text-yellow-700">
                {getSenderDisplayName(pinnedMessages[0].senderId)} •{" "}
                {formatTime(pinnedMessages[0].createdAt)}
              </div>
            </div>
            <button
              className="ml-2 p-1 rounded-full hover:bg-yellow-100 text-yellow-700"
              title="Bỏ ghim"
              onClick={() => handlePinMessage(pinnedMessages[0])}
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      {pinnedMessages.length > 1 && (
        <div className="px-6 pt-3 pb-1">
          <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2 shadow-sm">
            <MapPinIcon className="w-5 h-5 text-yellow-500" />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-bold text-yellow-800 truncate">
                {pinnedMessages[0].type === "text"
                  ? pinnedMessages[0].content
                  : pinnedMessages[0].type === "file"
                    ? pinnedMessages[0].metadata?.fileName ||
                    "Tệp đính kèm"
                    : pinnedMessages[0].type === "image"
                      ? "[Ảnh]"
                      : "[Tin nhắn hệ thống]"}
              </div>
              <div className="text-[11px] text-yellow-700">
                {getSenderDisplayName(pinnedMessages[0].senderId)} •{" "}
                {formatTime(pinnedMessages[0].createdAt)}
              </div>
            </div>
            <button
              className="ml-2 px-2 py-1 rounded-lg bg-yellow-100 text-yellow-800 text-xs font-bold hover:bg-yellow-200"
              onClick={() => setShowPinnedModal(true)}
            >
              Xem {pinnedMessages.length} tin nhắn đã ghim
            </button>
            <button
              className="ml-2 p-1 rounded-full hover:bg-yellow-100 text-yellow-700"
              title="Bỏ ghim"
              onClick={() => handlePinMessage(pinnedMessages[0])}
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal xem tất cả tin nhắn ghim */}
      {showPinnedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 relative">
            <button
              className="absolute top-2 right-2 p-2 rounded-full hover:bg-gray-100"
              onClick={() => setShowPinnedModal(false)}
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <MapPinIcon className="w-5 h-5 text-yellow-500" /> Tin nhắn
              đã ghim
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {pinnedMessages.map((msg) => (
                <div
                  key={msg._id}
                  className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-bold text-yellow-800 truncate">
                      {msg.type === "text"
                        ? msg.content
                        : msg.type === "file"
                          ? msg.metadata?.fileName || "Tệp đính kèm"
                          : msg.type === "image"
                            ? "[Ảnh]"
                            : "[Tin nhắn hệ thống]"}
                    </div>
                    <div className="text-[11px] text-yellow-700">
                      {getSenderDisplayName(msg.senderId)} •{" "}
                      {formatTime(msg.createdAt)}
                    </div>
                  </div>
                  <button
                    className="ml-2 p-1 rounded-full hover:bg-yellow-100 text-yellow-700"
                    title="Bỏ ghim"
                    onClick={() => handlePinMessage(msg)}
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal chi tiết bình chọn */}
      {activePollId && (
        <PollDetailsModal
          pollId={activePollId}
          onClose={() => setActivePollId(null)}
        />
      )}

      {/* Modal chọn thành viên gọi nhóm */}
      <GroupCallSelector
        isOpen={!!showCallMemberSelector}
        onClose={() => setShowCallMemberSelector(null)}
        onConfirm={confirmGroupCall}
        members={conversationInfo?.members || []}
        myId={myId || ""}
        userCache={userCache}
        isVideo={showCallMemberSelector?.isVideo || false}
      />

      {/* Floating Chat Summary Button */}
      {conversationId !== BOT_ID && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10 pointer-events-none flex justify-center w-full">
          <div className="pointer-events-auto">
            <ChatSummaryButton
              conversationId={conversationId}
              userId={myId || ""}
              messages={messages}
              conversationName={conversationInfo?.name}
              userCache={userCache}
            />
          </div>
        </div>
      )}
    </>
  );
}
