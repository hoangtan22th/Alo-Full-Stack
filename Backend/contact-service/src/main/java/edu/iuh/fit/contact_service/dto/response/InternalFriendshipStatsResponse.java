package edu.iuh.fit.contact_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InternalFriendshipStatsResponse {
    private long newFriendsAdded;
    private long totalCallMinutes;
}
