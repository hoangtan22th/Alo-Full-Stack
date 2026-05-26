package edu.iuh.fit.chatbot_service.dto;

import java.time.LocalDateTime;

public record MessageSnapshotDTO(
    String messageId,
    String senderId,
    String senderName,
    String senderAvatar,
    String content,
    String contentType,
    LocalDateTime sentAt,
    boolean isAnchor,
    Integer sequenceIndex,
    Integer totalMessagesInConversation,
    boolean isByReporter
) {}
