package edu.iuh.fit.report_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminActionRequest {

    public enum AdminAction {
        DISMISS, WARN, BAN
    }

    @NotNull(message = "Action is required")
    private AdminAction action;

    @NotBlank(message = "Admin notes are required for this action")
    private String adminNotes;

    @NotBlank(message = "Admin ID is required")
    private String adminId;

    private String targetName;
}
