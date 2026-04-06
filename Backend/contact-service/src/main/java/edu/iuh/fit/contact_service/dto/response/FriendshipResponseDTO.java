package edu.iuh.fit.contact_service.dto.response;

import edu.iuh.fit.contact_service.enums.FriendshipStatus;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class FriendshipResponseDTO {
    private String id;
    private String requesterId;
    private String recipientId;
    private String status;
    private String greetingMessage;

    private String requesterName;
    private String requesterAvatar;
}