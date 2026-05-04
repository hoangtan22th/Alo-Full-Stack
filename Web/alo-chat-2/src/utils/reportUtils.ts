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
  currentUserId: string
): MessageSnapshot[] => {
  let startIndex = 0;
  let endIndex = 0;

  if (anchorId) {
    const anchorIdx = conversationMessages.findIndex((m) => m._id === anchorId);
    if (anchorIdx !== -1) {
      // Strictly clamp boundaries to avoid out-of-bounds and ensure contiguous slice
      startIndex = Math.max(0, anchorIdx - 15);
      endIndex = Math.min(conversationMessages.length - 1, anchorIdx + 15);
    } else {
      // Fallback: Last 30 messages if anchor is missing for some reason
      startIndex = Math.max(0, conversationMessages.length - 30);
      endIndex = conversationMessages.length - 1;
    }
  } else {
    // Menu-based flow (no anchor): Last 30 messages
    startIndex = Math.max(0, conversationMessages.length - 30);
    endIndex = conversationMessages.length - 1;
  }

  // Slice includes the endIndex (+1 because slice is exclusive)
  const slicedMessages = conversationMessages.slice(startIndex, endIndex + 1);

  return slicedMessages.map((msg) => {
    // Find index in original array for immutable sequencing
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
    };
  });
};
