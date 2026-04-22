package edu.iuh.fit.report_service.dto.response;

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
    private UserResponse targetUser; // Will be populated if targetType == USER
    private TargetType targetType;
    
    private ReportReason reason;
    private ReportStatus status;
    
    private String description;
    private List<String> imageUrls;
    private List<String> messageIds;
    
    private String adminNotes;
    private String resolvedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
