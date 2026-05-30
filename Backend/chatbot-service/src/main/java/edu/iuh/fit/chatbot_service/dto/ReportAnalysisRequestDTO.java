package edu.iuh.fit.chatbot_service.dto;

import java.util.List;

public record ReportAnalysisRequestDTO(
    String reportId,
    String reason,
    String targetId,
    String targetType,
    String targetName,
    String conversationType,
    List<MessageSnapshotDTO> messageSnapshots
) {}
