package com.alochat.contactservice.dto;

import lombok.Data;

@Data
public class FriendRequestDTO {
    private String requesterId;
    private String recipientId;
    private String greetingMessage;
}