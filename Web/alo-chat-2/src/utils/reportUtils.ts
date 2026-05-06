import { MessageDTO } from "../services/messageService";

export interface MessageSnapshot {
  messageId: string;
  senderId: string;
  content: string;
  contentType: string;
  sentAt: string;
  isAnchor: boolean;
  sequenceIndex: number;
  totalMessagesInConversation: number;
  isByReporter: boolean;
  senderName?: string;
  senderAvatar?: string;
}

/**
 * Generates a snapshot of messages for evidence reporting.
 * Strictly follows V2.1 specifications:
 * - If anchorId is provided: Contiguous range of ±15 messages around the anchor (Max 31 total).
 * - If no anchorId: Last 30 messages in the conversation.
 */
export const generateEvidenceSnapshot = (
  anchorId: string | undefined,
  conversationMessages: MessageDTO[],
  currentUserId: string,
  getAvatarForUser: (senderId: string) => string = () => ""
): MessageSnapshot[] => {
  let startIndex = 0;
  let endIndex = 0;

  if (anchorId) {
    const anchorIdx = conversationMessages.findIndex((m) => m._id === anchorId);
    if (anchorIdx !== -1) {
      if (anchorIdx >= conversationMessages.length - 15) {
        startIndex = Math.max(0, conversationMessages.length - 30);
        endIndex = conversationMessages.length - 1;
      } else if (anchorIdx < 15) {
        startIndex = 0;
        endIndex = Math.min(conversationMessages.length - 1, 29);
      } else {
        startIndex = anchorIdx - 15;
        endIndex = anchorIdx + 15;
      }
    } else {
      startIndex = Math.max(0, conversationMessages.length - 30);
      endIndex = conversationMessages.length - 1;
    }
  } else {
    startIndex = Math.max(0, conversationMessages.length - 30);
    endIndex = conversationMessages.length - 1;
  }

  const slicedMessages = conversationMessages.slice(startIndex, endIndex + 1);

  return slicedMessages.map((msg) => {
    const originalIndex = conversationMessages.findIndex((m) => m._id === msg._id);

    return {
      messageId: msg._id,
      senderId: msg.senderId,
      content: msg.content,
      contentType: msg.type.toUpperCase(),
      sentAt: msg.createdAt,
      isAnchor: msg._id === anchorId,
      sequenceIndex: originalIndex,
      totalMessagesInConversation: conversationMessages.length,
      isByReporter: msg.senderId === currentUserId,
      senderName: msg.senderName,
      senderAvatar: getAvatarForUser(msg.senderId),
    };
  });
};
