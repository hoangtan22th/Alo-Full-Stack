package edu.iuh.fit.chatbot_service.dto;

import java.time.LocalDateTime;
import java.util.List;

public record ReportResponseDTO(
    String id,
    String reporterId,
    String targetId,
    String targetType,
    String reason,
    String status,
    List<String> imageUrls,
    LocalDateTime createdAt
) {}
