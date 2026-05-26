package edu.iuh.fit.chatbot_service.dto;

public record ModerationRequest(
    String messageId,
    String senderId,
    String senderName,
    String content,
    String type,
    String conversationId,
    boolean isGroup,
    String timestamp
) {}
