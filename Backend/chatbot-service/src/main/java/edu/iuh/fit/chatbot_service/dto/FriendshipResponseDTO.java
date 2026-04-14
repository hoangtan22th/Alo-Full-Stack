package edu.iuh.fit.chatbot_service.dto;

import lombok.Data;

@Data
public class FriendshipResponseDTO {
    private String id;               // friendshipId
    private String requesterId;
    private String recipientId;
    private String requesterName;
    private String recipientName;
    private String status;
    private String createdAt;
}