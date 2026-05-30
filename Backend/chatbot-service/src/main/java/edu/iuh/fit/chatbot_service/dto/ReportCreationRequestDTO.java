package edu.iuh.fit.chatbot_service.dto;

import java.util.List;

public record ReportCreationRequestDTO(
    String reporterId,
    String targetId,
    String targetType,
    String targetName,
    String conversationType,
    String conversationId,
    String reason,
    String description,
    List<String> imageUrls,
    List<MessageSnapshotDTO> messageSnapshots
) {}
