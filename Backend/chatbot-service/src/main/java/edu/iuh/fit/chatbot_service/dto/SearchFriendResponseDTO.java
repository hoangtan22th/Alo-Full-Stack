package edu.iuh.fit.chatbot_service.dto;
import lombok.Data;
@Data
public class SearchFriendResponseDTO {
    private String userId;
    private String fullName;
    private String phoneNumber;
    private boolean isFriend;
}