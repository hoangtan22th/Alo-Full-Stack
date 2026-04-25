"use client";
import React from "react";
import BotChatArea from "@/components/ui/BotChatArea";
import ChatInfoPanel from "@/components/chat/ChatInfoPanel";
import ChatHeader from "@/components/chat/ChatPage/ChatHeader";
import MessageInputBar from "@/components/chat/ChatPage/MessageInputBar";
import MessageList from "@/components/chat/ChatPage/MessageList";
import ChatModals from "@/components/chat/ChatPage/ChatModals";
import { useChatLogic } from "./useChatLogic";

export default function ChatPage() {
  const logic = useChatLogic();

  return (
    <div className="flex-1 flex h-full overflow-hidden">
      {logic.conversationId === logic.BOT_ID ? (
        <BotChatArea currentUser={logic.currentUser} />
      ) : (
        <div className="flex-1 flex h-full bg-white overflow-hidden">
          {/* ═══ CỘT GIỮA: NỘI DUNG CHAT ═══ */}
          <div className="flex-1 flex flex-col min-w-0 h-full bg-white relative">
            <ChatHeader
              conversationInfo={logic.conversationInfo}
              isStranger={logic.isStranger}
              relationStatus={logic.relationStatus}
              pinnedMessages={logic.pinnedMessages}
              showInfoPanel={logic.showInfoPanel}
              setShowInfoPanel={logic.setShowInfoPanel}
              handleStartCall={logic.handleStartCall}
              handlePinMessage={logic.handlePinMessage}
              getSenderDisplayName={logic.getSenderDisplayName}
              formatTime={logic.formatTime}
              getMediaUrl={logic.getMediaUrl}
              setShowProfileModal={logic.setShowProfileModal}
              conversationId={logic.conversationId}
              myId={logic.currentUser?.id || logic.currentUser?._id || ""}
              messages={logic.messages}
              userCache={logic.userCache}
              confirmGroupCall={logic.confirmGroupCall}
              showCallMemberSelector={logic.showCallMemberSelector}
              setShowCallMemberSelector={logic.setShowCallMemberSelector}
              activePollId={logic.activePollId}
              setActivePollId={logic.setActivePollId}
              showPinnedModal={logic.showPinnedModal}
              setShowPinnedModal={logic.setShowPinnedModal}
              BOT_ID={logic.BOT_ID}
            />

            <MessageList
              scrollContainerRef={logic.scrollContainerRef}
              topSentinelRef={logic.topSentinelRef}
              loadingMessages={logic.loadingMessages}
              messages={logic.messages}
              messageGroups={logic.messageGroups}
              loadingMoreHistory={logic.loadingMoreHistory}
              isMine={logic.isMine}
              getSenderDisplayName={logic.getSenderDisplayName}
              userCache={logic.userCache}
              conversationInfo={logic.conversationInfo}
              myRole={logic.myRole}
              adminIds={logic.adminIds}
              isMultiSelectMode={logic.isMultiSelectMode}
              toggleMessageSelection={logic.toggleMessageSelection}
              selectedMessageIds={logic.selectedMessageIds}
              setHoveredMsgId={logic.setHoveredMsgId}
              setMousePos={logic.setMousePos}
              isReportSelectionMode={logic.isReportSelectionMode}
              selectedMessagesForReport={logic.selectedMessagesForReport}
              toggleMessageForReport={logic.toggleMessageForReport}
              handleStartCall={logic.handleStartCall}
              setActivePollId={logic.setActivePollId}
              handlePinMessage={logic.handlePinMessage}
              handleCopy={logic.handleCopy}
              handleReply={logic.handleReply}
              handleForward={logic.handleForward}
              handleRevoke={logic.handleRevoke}
              handleDeleteForMe={logic.handleDeleteForMe}
              handleDownload={logic.handleDownload}
              setActiveAlbumIndex={logic.setActiveAlbumIndex}
              handleReaction={logic.handleReaction}
              setViewingReactions={logic.setViewingReactions}
              showMentionIndicator={logic.showMentionIndicator}
              setShowMentionIndicator={logic.setShowMentionIndicator}
              lastMentionMsgId={logic.lastMentionMsgId}
              activeMenu={logic.activeMenu}
              setActiveMenu={logic.setActiveMenu}
              activeReactionMenu={logic.activeReactionMenu}
              setActiveReactionMenu={logic.setActiveReactionMenu}
              mousePos={logic.mousePos}
              fixedMenuPos={logic.fixedMenuPos}
              setFixedMenuPos={logic.setFixedMenuPos}
              hoveredMsgId={logic.hoveredMsgId}
              onScroll={logic.handleScroll}
              showScrollBottomButton={logic.showScrollBottomButton}
              unreadScrollCount={logic.unreadScrollCount}
              scrollToBottom={logic.scrollToBottom}
            />

            <MessageInputBar
              fileInputRef={logic.fileInputRef}
              imageInputRef={logic.imageInputRef}
              handleFileChange={logic.handleFileChange}
              handleSendSticker={logic.handleSendSticker}
              handleImageButtonClick={logic.handleImageButtonClick}
              handleFileButtonClick={logic.handleFileButtonClick}
              replyingTo={logic.replyingTo}
              setReplyingTo={logic.setReplyingTo}
              getSenderDisplayName={logic.getSenderDisplayName}
              userCache={logic.userCache}
              mentionSearch={logic.mentionSearch}
              filteredMentions={logic.filteredMentions}
              mentionIndex={logic.mentionIndex}
              setMentionIndex={logic.setMentionIndex}
              handleSelectMention={logic.handleSelectMention}
              inputRef={logic.inputRef}
              messageText={logic.messageText}
              handleInputChange={logic.handleInputChange}
              handleKeyDown={logic.handleKeyDown}
              handleSend={logic.handleSend}
              sending={logic.sending}
            />
          </div>

          {/* ═══ CỘT PHẢI: THÔNG TIN CHI TIẾT ═══ */}
          <ChatInfoPanel
            show={logic.showInfoPanel}
            conversationId={logic.conversationId}
            conversationInfo={logic.conversationInfo}
            messages={logic.messages}
            currentUser={logic.currentUser}
            onClose={() => logic.setShowInfoPanel(false)}
            onClearHistory={logic.handleClearHistory}
            onLeaveGroup={logic.confirmLeaveGroup}
            onRemoveMember={logic.handleRemoveMember}
            onUpdateRole={logic.handleUpdateRole}
            onAssignLeader={logic.handleAssignLeader}
            onRefreshData={logic.handleRefreshData}
            userCache={logic.userCache}
            otherUserId={logic.otherUserId || ""}
            onOpenPollDetails={logic.setActivePollId}
          />

          <ChatModals
            viewingReactions={logic.viewingReactions}
            setViewingReactions={logic.setViewingReactions}
            EMOJI_MAP={logic.EMOJI_MAP}
            userCache={logic.userCache}
            activeAlbumIndex={logic.activeAlbumIndex}
            setActiveAlbumIndex={logic.setActiveAlbumIndex}
            messages={logic.messages}
            handleDownload={logic.handleDownload}
            forwardingMessage={logic.forwardingMessage}
            setForwardingMessage={logic.setForwardingMessage}
            forwardingMessages={logic.forwardingMessages}
            setForwardingMessages={logic.setForwardingMessages}
            currentUser={logic.currentUser}
            showProfileModal={logic.showProfileModal}
            setShowProfileModal={logic.setShowProfileModal}
            otherUserId={logic.otherUserId || ""}
            relationStatus={logic.relationStatus}
            fetchConversationInfo={logic.fetchConversationInfo}
            showLeaveModal={logic.showLeaveModal}
            setShowLeaveModal={logic.setShowLeaveModal}
            leaveOptions={logic.leaveOptions}
            setLeaveOptions={logic.setLeaveOptions}
            confirmLeaveGroup={logic.confirmLeaveGroup}
            groupInfoModal={logic.groupInfoModal}
            setGroupInfoModal={logic.setGroupInfoModal}
            joinGroupModal={logic.joinGroupModal}
            setJoinGroupModal={logic.setJoinGroupModal}
            joinGroupAnswer={logic.joinGroupAnswer}
            setJoinGroupAnswer={logic.setJoinGroupAnswer}
            joiningGroup={logic.joiningGroup}
            handleJoinGroup={logic.handleJoinGroup}
            isMultiSelectMode={logic.isMultiSelectMode}
            selectedMessageIds={logic.selectedMessageIds}
            clearMessageSelection={logic.clearMessageSelection}
            handleBulkCopy={logic.handleBulkCopy}
            handleBulkForward={logic.handleBulkForward}
            handleBulkRevoke={logic.handleBulkRevoke}
            handleBulkDeleteForMe={logic.handleBulkDeleteForMe}
            canBulkRevoke={logic.canBulkRevoke}
          />
        </div>
      )}
    </div>
  );
}
