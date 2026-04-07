package edu.iuh.fit.contact_service.dto.response;

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

    // THÊM 2 TRƯỜNG NÀY VÀO ĐÂY NHÉ
    private String recipientName;
    private String recipientAvatar;
}