package edu.iuh.fit.chatbot_service.dto;

public record AdminActionRequestDTO(
    String action,
    String adminNotes,
    String adminId,
    String targetName
) {}
