package edu.iuh.fit.chatbot_service.dto;

import lombok.Data;
import java.util.Date;

@Data
public class MessageDTO {
    private String _id;
    private String senderId;
    private String type; // text, image, file...
    private String content;
    private boolean isRevoked;
    private Date createdAt;
}