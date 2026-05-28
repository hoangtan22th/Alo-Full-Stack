package edu.iuh.fit.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class UserBannedEvent {

    private String targetId;
    private String targetType;
    private String targetName;
    private String adminNotes;
    private String reason;
    private String resolvedBy;
    private String leaderId;
    private String groupId;
    private String groupName;
    private LocalDateTime timestamp;
}
