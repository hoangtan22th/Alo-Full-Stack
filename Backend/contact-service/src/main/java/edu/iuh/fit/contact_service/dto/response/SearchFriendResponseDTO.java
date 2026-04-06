package edu.iuh.fit.contact_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SearchFriendResponseDTO {
    private String userId;
    private String fullName;
    private String avatarUrl;
    private String phone;
    private String relationStatus; // Trả về: NOT_FRIEND, PENDING, ACCEPTED
}