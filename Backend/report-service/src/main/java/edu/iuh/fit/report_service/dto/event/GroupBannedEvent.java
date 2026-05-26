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
public class GroupBannedEvent {
    private String groupId;
    private String groupName;
    private String adminNotes;
    private String resolvedBy;
    private String reason;
    private LocalDateTime timestamp;
}
