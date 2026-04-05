package edu.iuh.fit.contact_service.dto.request;

import lombok.Data;

@Data
public class FriendRequestDTO {
    private String requesterId;
    private String recipientId;
    private String greetingMessage;
}