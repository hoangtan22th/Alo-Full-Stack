package edu.iuh.fit.chatbot_service.dto;

import lombok.Data;
import java.util.List;

@Data
public class MessageHistoryResponse {
    private String conversationId;
    private List<MessageDTO> messages;
    private int count;
    private int limit;
    private int skip;
}