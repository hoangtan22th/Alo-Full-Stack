package edu.iuh.fit.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserQuickStatsResponse {
    private long totalUsers;
    private long newToday;
    private long onlineNow;
    private long bannedUsers;
}
