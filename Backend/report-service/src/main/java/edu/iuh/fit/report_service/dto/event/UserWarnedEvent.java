package edu.iuh.fit.report_service.dto.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserWarnedEvent {

    private String targetId;
    private String targetType;
    private String targetName;
    private String adminNotes;
    private String reason;
    private String resolvedBy;
    private String leaderId;
    private LocalDateTime timestamp;
}
