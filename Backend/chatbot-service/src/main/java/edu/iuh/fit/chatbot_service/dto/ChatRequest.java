package edu.iuh.fit.chatbot_service.dto;

public record ChatRequest(
        String message,
        String userId,
        String roomId
) {}
