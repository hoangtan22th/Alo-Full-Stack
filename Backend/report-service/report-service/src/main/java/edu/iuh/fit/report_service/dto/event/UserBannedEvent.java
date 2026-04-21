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
public class UserBannedEvent {

    private Long targetId;
    private String adminNotes;
    private Long resolvedBy;
    private LocalDateTime timestamp;
}
