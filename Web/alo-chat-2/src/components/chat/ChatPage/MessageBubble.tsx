import React from "react";
import {
  ArrowUturnLeftIcon,
  FaceSmileIcon,
  PaperAirplaneIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  DocumentIcon,
  FolderIcon,
  NoSymbolIcon,
  ExclamationCircleIcon,
  ClipboardDocumentIcon,
  MapPinIcon,
  PencilIcon,
  CheckIcon,
  EllipsisHorizontalIcon,
} from "@heroicons/react/24/outline";
import { CallSystemMessage } from "@/components/ui/call/CallSystemMessage";
import { getMediaUrl, renderContentWithMentions, formatTime } from "@/components/chat/ChatPage/utils";

interface MessageBubbleProps {
  msg: any;
  isMine: boolean;
  isFirst: boolean;
  isLast: boolean;
  senderName: string;
  senderAvatar: string;
  conversationInfo: any;
  adminIds: Set<string>;
  isMultiSelectMode: boolean;
  selectedMessageIds: Set<string>;
  toggleMessageSelection: (msg: any) => void;
  setHoveredMsgId: (id: string | null) => void;
  setMousePos: (pos: { x: number; y: number }) => void;
  isReportSelectionMode: boolean;
  selectedMessagesForReport: string[];
  toggleMessageForReport: (id: string) => void;
  handleStartCall: (isVideo: boolean) => void;
  handlePinMessage: (msg: any) => void;
  handleCopy: (text: string) => void;
  handleReply: (msg: any) => void;
  handleForward: (msg: any) => void;
  handleRevoke: (msg: any) => void;
  handleDeleteForMe: (msg: any) => void;
  handleDownload: (url: string, filename: string) => void;
  setActiveAlbumIndex: (val: any) => void;
  handleReaction: (msgId: string, emoji: string) => void;
  setViewingReactions: (val: any) => void;
  userCache: any;
  activeMenu: any;
  setActiveMenu: (val: any) => void;
  activeReactionMenu: string | null;
  setActiveReactionMenu: (val: string | null) => void;
  mousePos: { x: number; y: number };
  fixedMenuPos: { x: number; y: number };
  setFixedMenuPos: (val: { x: number; y: number }) => void;
  hoveredMsgId: string | null;
}

const EMOJI_LIST = ["👍", "❤️", "😄", "😮", "😢", "😠"];

export default function MessageBubble({
  msg,
  isMine,
  isFirst,
  isLast,
  senderName,
  senderAvatar,
  conversationInfo,
  adminIds,
  isMultiSelectMode,
  selectedMessageIds,
  toggleMessageSelection,
  setHoveredMsgId,
  setMousePos,
  isReportSelectionMode,
  selectedMessagesForReport,
  toggleMessageForReport,
  handleStartCall,
  handlePinMessage,
  handleCopy,
  handleReply,
  handleForward,
  handleRevoke,
  handleDeleteForMe,
  handleDownload,
  setActiveAlbumIndex,
  handleReaction,
  setViewingReactions,
  userCache,
  activeMenu,
  setActiveMenu,
  activeReactionMenu,
  setActiveReactionMenu,
  mousePos,
  fixedMenuPos,
  setFixedMenuPos,
  hoveredMsgId,
}: MessageBubbleProps) {
  const isRevoked = msg.isRevoked;

  // Bo góc bubble
  const bubbleRadius = isMine
    ? [
        "rounded-2xl",
        isFirst && !isLast ? "rounded-br-md" : "",
        !isFirst && !isLast ? "rounded-r-md" : "",
        !isFirst && isLast ? "rounded-br-sm" : "",
      ].join(" ")
    : [
        "rounded-2xl",
        isFirst && !isLast ? "rounded-bl-md" : "",
        !isFirst && !isLast ? "rounded-l-md" : "",
        !isFirst && isLast ? "rounded-bl-sm" : "",
      ].join(" ");

  const getSenderDisplayName = (uid: string) => {
    return userCache[uid]?.name || "Người dùng";
  };

  return (
    <div
      id={`msg-${msg._id}`}
      onClick={() => {
        if (isMultiSelectMode) {
          toggleMessageSelection(msg);
        }
      }}
      className={`flex items-center gap-1.5 transition-colors duration-500 ${isMine ? "flex-row-reverse" : "flex-row"} ${isMultiSelectMode ? "cursor-pointer" : ""}`}
      onMouseEnter={(e) => {
        setHoveredMsgId(msg._id);
        setMousePos({ x: e.clientX, y: e.clientY });
      }}
      onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
      onMouseLeave={() => {
        // Nếu đang mở menu cảm xúc thì không ẩn nút hover
        if (activeReactionMenu === msg._id) return;
        
        setTimeout(() => {
          // Kiểm tra lại lần nữa trong trường hợp menu vừa được đóng
          setHoveredMsgId(null);
        }, 200);
      }}
    >
      {/* Avatar placeholder */}
      <div className="w-8 shrink-0">
        {!isMine &&
          isLast &&
          (senderAvatar ? (
            <img
              src={senderAvatar}
              alt={senderName}
              title={senderName}
              className="w-8 h-8 rounded-full object-cover shadow-sm ring-1 ring-black/5"
            />
          ) : (
            <div
              className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-[12px] shadow-sm ring-1 ring-black/5"
              title={senderName}
            >
              {senderName.charAt(0).toUpperCase()}
            </div>
          ))}
      </div>

      {/* Selection checkbox (report mode) */}
      {isReportSelectionMode && (
        <div className="flex items-center ml-2 mr-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleMessageForReport(msg._id);
            }}
            className={`w-8 h-8 rounded-full flex items-center justify-center border transition-colors ${selectedMessagesForReport.includes(msg._id)
                ? "bg-blue-600 text-white ring-2 ring-blue-300"
                : "bg-white border-gray-200 hover:bg-gray-50"
              }`}
            title={selectedMessagesForReport.includes(msg._id) ? "Unselect" : "Select"}
          >
            {selectedMessagesForReport.includes(msg._id) ? (
              <svg className="w-4 h-4 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 00-1.414-1.414L8 11.172 4.707 7.879a1 1 0 10-1.414 1.414l4 4a1 1 0 001.414 0l8-8z" clipRule="evenodd" /></svg>
            ) : null}
          </button>
        </div>
      )}

      {/* Bubble */}
      <div className={`relative max-w-[75%] flex flex-col ${isMine ? "items-end" : "items-start"} transition-all duration-300 ${isMultiSelectMode ? "p-1 rounded-2xl" : ""} ${selectedMessageIds.has(msg._id) ? "bg-black/10 shadow-inner" : isMultiSelectMode ? "hover:bg-black/5" : ""}`}>
        {/* System messages (General & Call) */}
        {(msg.type as any) === "system" ? (
          msg.metadata?.callType ? (
            <CallSystemMessage
              isMine={isMine}
              metadata={msg.metadata as any}
              createdAt={msg.createdAt}
              onCallAgain={(isVideo) => handleStartCall(isVideo)}
            />
          ) : (
            <div className="flex justify-center w-full my-4 px-10">
              <div className="bg-gray-100/50 backdrop-blur-sm text-gray-500 text-[11px] font-bold py-1.5 px-4 rounded-full border border-gray-200/50 shadow-sm text-center uppercase tracking-tight">
                {msg.content}
              </div>
            </div>
          )
        ) : (
          <div
            className={`relative max-w-full flex flex-col p-1.5 px-2 border shadow-sm ${isMine
                ? "bg-blue-50/80 shadow-blue-900/5 items-end"
                : "bg-white shadow-gray-900/5 items-start"
              } ${conversationInfo?.isHighlightEnabled && adminIds.has(String(msg.senderId))
                ? "border-amber-300 ring-2 ring-amber-200/50"
                : isMine
                  ? "border-blue-100"
                  : "border-gray-100"
              } ${bubbleRadius} ${isReportSelectionMode && !selectedMessagesForReport.includes(msg._id)
                ? "opacity-50 filter grayscale"
                : ""
              } ${selectedMessagesForReport.includes(msg._id) ? "ring-2 ring-blue-300" : ""}`}
          >
            {/* Reply Quote Box */}
            {msg.replyTo && msg.replyTo.messageId && !isRevoked && (
              <div
                className={`mb-2 px-3 py-2 border-l-[3px] border-blue-600 ${isMine ? "bg-white/50" : "bg-blue-50/50"} rounded-r-lg text-left cursor-pointer hover:bg-white/80 transition-colors w-full min-w-[150px] max-w-full overflow-hidden`}
                onClick={() => {
                  const targetMsg = document.getElementById(`msg-${msg.replyTo?.messageId}`);
                  targetMsg?.scrollIntoView({ behavior: "smooth", block: "center" });
                  targetMsg?.classList.add("bg-yellow-100/50");
                  setTimeout(() => targetMsg?.classList.remove("bg-yellow-100/50"), 2000);
                }}
              >
                <div className="flex gap-2.5 items-center">
                  {msg.replyTo.type === "image" && (
                    <img
                      src={msg.replyTo.content}
                      alt="reply"
                      className="w-10 h-10 object-cover rounded-md shrink-0 border border-gray-100"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-gray-800 truncate">
                      {getSenderDisplayName(msg.replyTo.senderId)}
                    </p>
                    <p className="text-[13px] text-gray-500 line-clamp-1 leading-tight mt-0.5 whitespace-normal">
                      {msg.replyTo.type === "image"
                        ? "[Hình ảnh]"
                        : msg.replyTo.type === "file"
                          ? msg.replyTo.content.startsWith("http")
                            ? "[Tệp tin]"
                            : msg.replyTo.content
                          : msg.replyTo.content}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Display Sender Name in Group Chat */}
            {conversationInfo?.isGroup && !isMine && isFirst && !isRevoked && (
              <span className="text-[11px] font-black text-blue-600/80 mb-1 ml-0.5 tracking-tight uppercase">
                {senderName}
              </span>
            )}

            {/* Content Logic */}
            {isRevoked ? (
              <div className="flex items-center gap-2 text-gray-400 italic py-1 px-1">
                <ArrowUturnLeftIcon className="w-3.5 h-3.5 opacity-50" />
                <span className="text-[13px] font-medium">
                  {isMine ? "Bạn đã thu hồi một tin nhắn" : "Tin nhắn đã được thu hồi"}
                </span>
              </div>
            ) : (
              <div className="w-full">
                {msg.type === "text" && (
                  <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words font-medium text-gray-800 px-1">
                    {renderContentWithMentions(msg.content, conversationInfo?.members || [], userCache)}
                  </p>
                )}

                {msg.type === "image" && (
                  <div className="flex flex-col gap-1.5 w-full">
                    {msg.metadata?.imageGroup ? (
                      <div className={`grid gap-1 ${msg.metadata.imageGroup.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                        {msg.metadata.imageGroup.map((img: any, idx: number) => (
                          <div
                            key={idx}
                            className="relative aspect-square cursor-pointer overflow-hidden rounded-xl border border-black/5 hover:opacity-90 transition active:scale-95 group"
                            onClick={() => setActiveAlbumIndex({ messageId: msg._id, index: idx })}
                          >
                            <img src={getMediaUrl(img.url)} className="w-full h-full object-cover" alt="album" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <img
                        src={getMediaUrl(msg.content)}
                        alt="attachment"
                        className="max-w-full h-auto rounded-xl shadow-sm border border-black/5 cursor-pointer hover:opacity-90 transition active:scale-95"
                        onClick={() => setActiveAlbumIndex({ messageId: msg._id, index: 0 })}
                      />
                    )}
                    {msg.content && msg.metadata?.imageGroup && (
                      <p className="text-[14px] leading-relaxed text-gray-800 px-1 mt-1 font-medium">
                        {renderContentWithMentions(msg.content, conversationInfo?.members || [], userCache)}
                      </p>
                    )}
                  </div>
                )}

                {msg.type === "file" && (
                  <div className="flex flex-col gap-2 w-full min-w-[200px]">
                    <div className="flex items-center gap-3 p-3 bg-white/50 rounded-xl border border-gray-100 hover:bg-white transition group relative overflow-hidden">
                      <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shadow-inner group-hover:scale-110 transition-transform">
                        <DocumentIcon className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-bold text-gray-900 truncate">
                          {msg.metadata?.fileName || "Tệp tin"}
                        </p>
                        <p className="text-[11px] font-bold text-gray-400 mt-0.5">
                          {msg.metadata?.fileSize
                            ? (msg.metadata.fileSize / 1024).toFixed(1) + " KB"
                            : "Tệp đính kèm"}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDownload(getMediaUrl(msg.content), msg.metadata?.fileName || "file")}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition active:scale-90"
                      >
                        <ArrowDownTrayIcon className="w-5 h-5" />
                      </button>
                    </div>
                    {msg.metadata?.caption && (
                      <p className="text-[14px] text-gray-800 px-1 font-medium">
                        {renderContentWithMentions(msg.metadata.caption, conversationInfo?.members || [], userCache)}
                      </p>
                    )}
                  </div>
                )}

                {msg.type === "sticker" && (
                  <img src={msg.content} alt="sticker" className="w-32 h-32 object-contain" />
                )}
              </div>
            )}

            {/* Timestamp & Status (inside bubble for Zalo-like feel) */}
            <div className={`flex items-center gap-1.5 mt-1.5 ${isMine ? "justify-end" : "justify-start"}`}>
              <span className="text-[10px] font-bold text-gray-400/80 tracking-tighter">
                {formatTime(msg.createdAt)}
              </span>
              {isMine && isLast && !isRevoked && (
                <div className="flex items-center">
                  {msg.isRead ? (
                    <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Đã xem</span>
                  ) : (
                    <CheckIcon className="w-3 h-3 text-gray-300" strokeWidth={3} />
                  )}
                </div>
              )}
            </div>

            {/* Reactions Overlay */}
            {!isRevoked && msg.reactions && msg.reactions.length > 0 && (
              <div
                className={`absolute -bottom-4 ${isMine ? "right-2" : "left-2"} flex items-center bg-white border border-gray-100 rounded-full px-1.5 py-0.5 shadow-xl shadow-black/5 hover:scale-110 transition cursor-pointer z-10 active:scale-95`}
                onClick={() => setViewingReactions({ messageId: msg._id, reactions: msg.reactions, activeTab: "all" })}
              >
                <div className="flex -space-x-1 mr-1.5">
                  {Array.from(new Set(msg.reactions.map((r: any) => r.emoji)))
                    .slice(0, 3)
                    .map((emoji: any, idx) => (
                      <span key={idx} className="text-[14px] drop-shadow-sm">
                        {(EMOJI_LIST.find(e => e.includes(emoji)) || emoji)}
                      </span>
                    ))}
                </div>
                {msg.reactions.length > 1 && (
                  <span className="text-[10px] font-black text-gray-500 pr-0.5">
                    {msg.reactions.reduce((acc: number, r: any) => acc + (r.count || 1), 0)}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Hover Controls (Actions & Reactions) */}
        {!isRevoked && hoveredMsgId === msg._id && !isMultiSelectMode && (
          <div
            className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-1 z-40 ${isMine ? "right-full mr-3 flex-row-reverse" : "left-full ml-3"
              }`}
          >
            {/* Nút Thả cảm xúc */}
            <div className="relative group/reaction">
              <button
                onMouseEnter={() => setActiveReactionMenu(msg._id)}
                onClick={(e) => e.stopPropagation()}
                className="w-8 h-8 flex items-center justify-center bg-white border border-gray-100 rounded-full shadow-lg text-gray-400 hover:text-blue-600 transition hover:bg-gray-50 active:scale-90"
              >
                <FaceSmileIcon className="w-5 h-5" />
              </button>

              {activeReactionMenu === msg._id && (
                <>
                  {/* Invisible bridge to prevent mouse-out when moving to the menu */}
                  <div className="absolute bottom-full left-0 right-0 h-4 z-40" />
                  
                  <div 
                    className={`absolute bottom-full mb-1 flex items-center gap-0.5 bg-white/95 backdrop-blur-md border border-gray-100 rounded-full p-1 shadow-2xl animate-in zoom-in duration-150 z-50 ${isMine ? "right-0" : "left-0"}`}
                    onMouseEnter={() => {
                      setActiveReactionMenu(msg._id);
                    }}
                    onMouseLeave={() => {
                      setTimeout(() => setActiveReactionMenu(null), 300);
                    }}
                  >
                  {EMOJI_LIST.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        handleReaction(msg._id, emoji);
                        setActiveReactionMenu(null);
                      }}
                      className="w-8 h-8 flex items-center justify-center text-lg hover:scale-125 transition active:scale-90"
                    >
                      {emoji}
                    </button>
                  ))}
                  </div>
                </>
              )}
            </div>

            {/* More Actions Toggle */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setFixedMenuPos({ x: e.clientX, y: e.clientY });
                setActiveMenu(activeMenu === msg._id ? null : msg._id);
              }}
              className="w-8 h-8 flex items-center justify-center bg-white border border-gray-100 rounded-full shadow-lg text-gray-400 hover:text-gray-900 transition hover:bg-gray-50 active:scale-90"
            >
              <EllipsisHorizontalIcon className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Context Menu Dropdown */}
        {activeMenu === msg._id && (
            <div 
              className="fixed z-[9999] w-52 bg-white/95 backdrop-blur-xl border border-gray-100 rounded-2xl shadow-2xl py-2 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
              onClick={(e) => e.stopPropagation()}
              style={{
                top: Math.min(fixedMenuPos.y, window.innerHeight - 300),
                left: isMine ? fixedMenuPos.x - 220 : fixedMenuPos.x + 10,
              }}
            >
            {msg.type === "text" && (
              <button
                onClick={() => handleCopy(msg.content)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-bold text-gray-700 hover:bg-gray-50 transition"
              >
                <ClipboardDocumentIcon className="w-4 h-4 text-gray-400" /> Sao chép
              </button>
            )}
            <button
              onClick={() => handleReply(msg)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-bold text-gray-700 hover:bg-gray-50 transition"
            >
              <PaperAirplaneIcon className="w-4 h-4 -rotate-90 text-gray-400" /> Trả lời
            </button>
            <button
              onClick={() => handleForward(msg)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-bold text-gray-700 hover:bg-gray-50 transition"
            >
              <PaperAirplaneIcon className="w-4 h-4 text-gray-400" /> Chuyển tiếp
            </button>
            <button
              onClick={() => handlePinMessage(msg)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-bold text-gray-700 hover:bg-gray-50 transition"
            >
              <MapPinIcon className="w-4 h-4 text-gray-400" /> Ghim tin nhắn
            </button>

            <div className="h-px bg-gray-50 my-1 mx-2" />

            {isMine && (
              <button
                onClick={() => handleRevoke(msg)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-bold text-orange-600 hover:bg-orange-50 transition"
              >
                <ArrowUturnLeftIcon className="w-4 h-4" /> Thu hồi
              </button>
            )}
            <button
              onClick={() => handleDeleteForMe(msg)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-bold text-red-600 hover:bg-red-50 transition"
            >
              <TrashIcon className="w-4 h-4" /> Xóa ở phía tôi
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
