package edu.iuh.fit.report_service.dto.request;

import edu.iuh.fit.report_service.entity.MessageSnapshot;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportAnalysisRequest {
    private String reportId;
    private String reason;
    private String targetId;
    private String targetType;
    private String targetName;
    private String conversationType;
    private List<MessageSnapshot> messageSnapshots;
}
