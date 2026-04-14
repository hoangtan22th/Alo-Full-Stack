package edu.iuh.fit.chatbot_service.dto;
import lombok.Data;
@Data
public class FriendshipResponseDTO {
    private String friendshipId;
    private String friendId;
    private String friendName;
    private String status;
}
