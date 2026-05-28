package edu.iuh.fit.chatbot_service.dto;

public record ReportAdminResponseDTO(
    String id,
    String status,
    String resolvedAction,
    String resolvedBy
) {}
