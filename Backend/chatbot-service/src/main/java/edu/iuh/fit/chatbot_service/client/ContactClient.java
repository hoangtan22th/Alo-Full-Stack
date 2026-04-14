package edu.iuh.fit.chatbot_service.client;

import edu.iuh.fit.common_service.dto.response.ApiResponse;
import edu.iuh.fit.chatbot_service.dto.FriendRequestDTO;
import edu.iuh.fit.chatbot_service.dto.FriendshipResponseDTO;
import edu.iuh.fit.chatbot_service.dto.SearchFriendResponseDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@FeignClient(name = "contact-service")
public interface ContactClient {
    @GetMapping("/api/v1/contacts/friends")
    ApiResponse<List<FriendshipResponseDTO>> getFriendsList(@RequestHeader("X-User-Id") String userId);

    @GetMapping("/api/v1/contacts/search")
    ApiResponse<SearchFriendResponseDTO> searchUserByPhone(@RequestParam String phone,
                                                           @RequestHeader("X-User-Id") String userId);

    @PostMapping("/api/v1/contacts/request")
    ApiResponse<FriendshipResponseDTO> sendFriendRequest(@RequestBody FriendRequestDTO requestDTO,
                                                         @RequestHeader("X-User-Id") String requesterId);
}