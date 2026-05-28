package edu.iuh.fit.report_service.dto.response;

import edu.iuh.fit.report_service.entity.ReportReason;
import edu.iuh.fit.report_service.entity.ReportStatus;
import edu.iuh.fit.report_service.entity.TargetType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class ReportResponse {

    private String id;
    private String reporterId;
    private String targetId;
    private TargetType targetType;
    private ReportReason reason;
    private ReportStatus status;
    private List<String> imageUrls;
    private LocalDateTime createdAt;
}
