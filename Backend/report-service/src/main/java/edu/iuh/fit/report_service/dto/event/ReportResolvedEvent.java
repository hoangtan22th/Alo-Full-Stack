package edu.iuh.fit.report_service.dto.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportResolvedEvent {
    private String reportId;
    private String targetId;
    private String targetType;
    private String targetName;
    private String action; // WARN, BAN, DISMISS
    private String reason;
}
