package edu.iuh.fit.report_service.dto.response;

import edu.iuh.fit.report_service.entity.ConversationType;
import edu.iuh.fit.report_service.entity.MessageSnapshot;
import edu.iuh.fit.report_service.entity.ReportReason;
import edu.iuh.fit.report_service.entity.ReportStatus;
import edu.iuh.fit.report_service.entity.TargetType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportAdminResponse {

    private String id;

    // Aggregated data via Feign
    private UserResponse reporter;

    private String targetId;
    private String targetName;
    private UserResponse targetUser; // Will be populated if targetType == USER
    private GroupResponse.GroupData targetGroup; // Will be populated if targetType == GROUP
    private TargetType targetType;

    private ConversationType conversationType;
    private String conversationId;

    private ReportReason reason;
    private ReportStatus status;

    private String description;
    private List<String> imageUrls;
    private List<MessageSnapshot> messageSnapshots;

    private String adminNotes;
    private String resolvedBy;
    private String lockedBy;
    private LocalDateTime lockedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
