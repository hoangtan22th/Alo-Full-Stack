package edu.iuh.fit.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserUnbannedEvent {
    private String targetId;
    private String adminNotes;
    private String resolvedBy;
    private LocalDateTime timestamp;
}