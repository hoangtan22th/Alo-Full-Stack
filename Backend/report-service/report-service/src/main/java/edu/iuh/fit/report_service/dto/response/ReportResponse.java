package edu.iuh.fit.report_service.dto.response;

import edu.iuh.fit.report_service.entity.ReportReason;
import edu.iuh.fit.report_service.entity.ReportStatus;
import edu.iuh.fit.report_service.entity.TargetType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ReportResponse {

    private String id;
    private Long reporterId;
    private Long targetId;
    private TargetType targetType;
    private ReportReason reason;
    private ReportStatus status;
    private LocalDateTime createdAt;
}
