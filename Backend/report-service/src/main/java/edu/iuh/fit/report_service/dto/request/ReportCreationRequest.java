package edu.iuh.fit.report_service.dto.request;

import edu.iuh.fit.report_service.entity.ConversationType;
import edu.iuh.fit.report_service.entity.MessageSnapshot;
import edu.iuh.fit.report_service.entity.ReportReason;
import edu.iuh.fit.report_service.entity.TargetType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
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
    @Size(max = 255, message = "Reporter ID is too long")
    private String reporterId;

    @NotBlank(message = "Target ID cannot be null")
    @Size(max = 255, message = "Target ID is too long")
    private String targetId;

    @NotNull(message = "Target Type is required")
    private TargetType targetType;

    @Size(min = 1, max = 1000, message = "Target Name must be between 1 and 1000 characters")
    private String targetName;

    @NotNull(message = "Conversation Type is required")
    private ConversationType conversationType;

    @NotBlank(message = "Conversation ID is required")
    @Size(max = 255, message = "Conversation ID is too long")
    private String conversationId;

    @NotNull(message = "Report Reason is required")
    private ReportReason reason;

    @Size(min = 1, max = 1000, message = "Description must be between 1 and 1000 characters")
    private String description;

    private List<String> imageUrls;

    private List<MessageSnapshot> messageSnapshots;
}
