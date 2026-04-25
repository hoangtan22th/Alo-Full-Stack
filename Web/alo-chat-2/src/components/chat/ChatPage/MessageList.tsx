import React from "react";
import {
  ArrowPathIcon,
  FaceSmileIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import PollMessagePreview from "@/components/chat/PollMessagePreview";
import { CallSystemMessage } from "@/components/ui/call/CallSystemMessage";
import { MessageDTO } from "@/services/messageService";
import MessageBubble from "@/components/chat/ChatPage/MessageBubble";

interface MessageListProps {
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  topSentinelRef: React.RefObject<HTMLDivElement | null>;
  loadingMessages: boolean;
  messages: MessageDTO[];
  messageGroups: any[];
  loadingMoreHistory: boolean;
  isMine: (senderId: string) => boolean;
  getSenderDisplayName: (senderId: string, msg: any) => string;
  userCache: any;
  conversationInfo: any;
  myRole: string;
  adminIds: Set<string>;
  isMultiSelectMode: boolean;
  toggleMessageSelection: (msg: any) => void;
  selectedMessageIds: Set<string>;
  setHoveredMsgId: (id: string | null) => void;
  setMousePos: (pos: { x: number; y: number }) => void;
  isReportSelectionMode: boolean;
  selectedMessagesForReport: string[];
  toggleMessageForReport: (id: string) => void;
  handleStartCall: (isVideo: boolean) => void;
  setActivePollId: (id: string | null) => void;
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
  showMentionIndicator: boolean;
  setShowMentionIndicator: (val: boolean) => void;
  lastMentionMsgId: string | null;
  activeMenu: any;
  setActiveMenu: (val: any) => void;
  activeReactionMenu: string | null;
  setActiveReactionMenu: (val: string | null) => void;
  mousePos: { x: number; y: number };
  fixedMenuPos: { x: number; y: number };
  setFixedMenuPos: (val: { x: number; y: number }) => void;
  hoveredMsgId: string | null;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  showScrollBottomButton?: boolean;
  unreadScrollCount?: number;
  scrollToBottom?: () => void;
}

export default function MessageList({
  scrollContainerRef,
  topSentinelRef,
  loadingMessages,
  messages,
  messageGroups,
  loadingMoreHistory,
  isMine,
  getSenderDisplayName,
  userCache,
  conversationInfo,
  myRole,
  adminIds,
  isMultiSelectMode,
  toggleMessageSelection,
  selectedMessageIds,
  setHoveredMsgId,
  setMousePos,
  isReportSelectionMode,
  selectedMessagesForReport,
  toggleMessageForReport,
  handleStartCall,
  setActivePollId,
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
  showMentionIndicator,
  setShowMentionIndicator,
  lastMentionMsgId,
  activeMenu,
  setActiveMenu,
  activeReactionMenu,
  setActiveReactionMenu,
  mousePos,
  fixedMenuPos,
  setFixedMenuPos,
  hoveredMsgId,
  onScroll,
  showScrollBottomButton,
  unreadScrollCount,
  scrollToBottom,
}: MessageListProps) {
  return (
    <div
      ref={scrollContainerRef}
      onScroll={onScroll}
      className="flex-1 overflow-y-auto px-5 py-4 scrollbar-hide relative"
    >
      {loadingMessages ? (
        <div className="flex items-center justify-center h-full">
          <ArrowPathIcon className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      ) : messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
          <FaceSmileIcon className="w-10 h-10 opacity-30" />
          <p className="text-[13px] font-medium">
            Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {/* Top Sentinel for Infinite Scroll */}
          <div ref={topSentinelRef} className="h-4 w-full" />

          {/* Loading History Spinner */}
          {loadingMoreHistory && (
            <div className="flex justify-center p-4">
              <ArrowPathIcon className="w-5 h-5 text-blue-500 animate-spin" />
            </div>
          )}

          {messageGroups.map((group, groupIdx) => {
            const { isMine: groupIsMine, messages: gMsgs, senderId } = group;
            const lastMsg = gMsgs[gMsgs.length - 1];

            if (lastMsg.type === "system" && !lastMsg.metadata?.callType) {
              return (
                <div
                  key={`group-${groupIdx}`}
                  className="flex justify-center my-4 w-full px-10"
                >
                  <div className="flex flex-col items-center gap-1.5 max-w-full">
                    {gMsgs
                      .filter(
                        (m: any) =>
                          !(
                            m.metadata?.isSilentLeave &&
                            myRole === "MEMBER"
                          ),
                      )
                      .map((msg: any) => (
                        <div
                          key={msg._id}
                          className="bg-gray-100 px-4 py-1.5 rounded-full shadow-sm border border-gray-200/50 max-w-full"
                        >
                          <span className="text-[12px] text-gray-500 font-bold text-center block">
                            {msg.content}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              );
            }

            if (lastMsg.type === "poll") {
              return (
                <div
                  key={`group-${groupIdx}`}
                  className="flex justify-center my-6 w-full px-4"
                >
                  <PollMessagePreview
                    pollId={lastMsg.metadata?.pollId as string}
                    isSender={false}
                    onOpenDetails={(id) => setActivePollId(id)}
                  />
                </div>
              );
            }

            const senderName = getSenderDisplayName(senderId, lastMsg);
            let senderAvatar = "";

            if (conversationInfo?.isGroup && !groupIsMine) {
              senderAvatar = userCache[senderId]?.avatar || "";
            } else {
              senderAvatar = conversationInfo?.displayAvatar || "";
            }

            return (
              <div
                key={`group-${groupIdx}`}
                className={`flex flex-col gap-0.5 w-full ${groupIsMine ? "items-end" : "items-start"} mb-3`}
              >
                {gMsgs.map((msg: any, msgIdx: number) => (
                  <MessageBubble
                    key={msg._id}
                    msg={msg}
                    isMine={groupIsMine}
                    isFirst={msgIdx === 0}
                    isLast={msgIdx === gMsgs.length - 1}
                    senderName={senderName}
                    senderAvatar={senderAvatar}
                    conversationInfo={conversationInfo}
                    adminIds={adminIds}
                    isMultiSelectMode={isMultiSelectMode}
                    selectedMessageIds={selectedMessageIds}
                    toggleMessageSelection={toggleMessageSelection}
                    setHoveredMsgId={setHoveredMsgId}
                    setMousePos={setMousePos}
                    isReportSelectionMode={isReportSelectionMode}
                    selectedMessagesForReport={selectedMessagesForReport}
                    toggleMessageForReport={toggleMessageForReport}
                    handleStartCall={handleStartCall}
                    handlePinMessage={handlePinMessage}
                    handleCopy={handleCopy}
                    handleReply={handleReply}
                    handleForward={handleForward}
                    handleRevoke={handleRevoke}
                    handleDeleteForMe={handleDeleteForMe}
                    handleDownload={handleDownload}
                    setActiveAlbumIndex={setActiveAlbumIndex}
                    handleReaction={handleReaction}
                    setViewingReactions={setViewingReactions}
                    userCache={userCache}
                    activeMenu={activeMenu}
                    setActiveMenu={setActiveMenu}
                    activeReactionMenu={activeReactionMenu}
                    setActiveReactionMenu={setActiveReactionMenu}
                    mousePos={mousePos}
                    fixedMenuPos={fixedMenuPos}
                    setFixedMenuPos={setFixedMenuPos}
                    hoveredMsgId={hoveredMsgId}
                  />
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Mention Indicator */}
      {showMentionIndicator && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-bottom-4">
          <button
            onClick={() => {
              if (lastMentionMsgId) {
                const target = document.getElementById(`msg-${lastMentionMsgId}`);
                target?.scrollIntoView({ behavior: "smooth", block: "center" });
              }
              setShowMentionIndicator(false);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-bold py-2 px-4 rounded-full shadow-2xl flex items-center gap-2 transition-all active:scale-95 group"
          >
            <span className="bg-white/20 w-5 h-5 rounded-full flex items-center justify-center italic text-[10px]">@</span>
            Nhắc đến bạn
            <div
              className="ml-1 p-0.5 hover:bg-white/20 rounded-full transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setShowMentionIndicator(false);
              }}
            >
              <XMarkIcon className="w-3.5 h-3.5" strokeWidth={2.5} />
            </div>
          </button>
        </div>
      )}

      {/* Scroll To Bottom Button */}
      {showScrollBottomButton && scrollToBottom && (
        <div className="absolute bottom-6 right-6 z-30 animate-in fade-in zoom-in slide-in-from-bottom-5">
          <button
            onClick={() => scrollToBottom()}
            className="w-10 h-10 bg-white/90 backdrop-blur-sm border border-gray-200 text-gray-600 rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 hover:text-black transition-all active:scale-95 group relative"
          >
            <svg
              className="w-5 h-5 group-hover:translate-y-0.5 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            {unreadScrollCount ? (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                {unreadScrollCount > 9 ? "9+" : unreadScrollCount}
              </span>
            ) : null}
          </button>
        </div>
      )}
    </div>
  );
}
