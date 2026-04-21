package edu.iuh.fit.report_service.dto.request;

import edu.iuh.fit.report_service.entity.ReportReason;
import edu.iuh.fit.report_service.entity.TargetType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportCreationRequest {

    @NotBlank(message = "Reporter ID cannot be null")
    private String reporterId;

    @NotBlank(message = "Target ID cannot be null")
    private String targetId;

    @NotNull(message = "Target Type is required")
    private TargetType targetType;

    @NotNull(message = "Report Reason is required")
    private ReportReason reason;

    private String description;

    private List<String> imageUrls;

    private List<String> messageIds;
}
