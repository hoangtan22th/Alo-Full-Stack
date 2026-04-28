package edu.iuh.fit.report_service.dto.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportCreatedEvent {
    private String reportId;
    private String reporterId;
    private String targetId;
    private String targetType;
    private String targetName;
    private String reason;
}
