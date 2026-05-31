package edu.iuh.fit.report_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
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
        DISMISS, WARN, BAN, DISBAND_GROUP
    }

    @NotNull(message = "Action is required")
    private AdminAction action;

    @NotBlank(message = "Vui lòng nhập ghi chú trước khi thực hiện hành động")
    @Size(max = 500, message = "Ghi chú không được vượt quá 500 ký tự")
    private String adminNotes;

    private String adminId;

    private String targetName;
}
