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

    // Danh sách bạn bè
    @GetMapping("/api/v1/contacts/friends")
    ApiResponse<List<FriendshipResponseDTO>> getFriendsList(@RequestHeader("X-User-Id") String userId);

    // Tìm theo số điện thoại
    @GetMapping("/api/v1/contacts/search")
    ApiResponse<SearchFriendResponseDTO> searchUserByPhone(@RequestParam String phone,
                                                           @RequestHeader("X-User-Id") String userId);

    // Gửi lời mời
    @PostMapping("/api/v1/contacts/request")
    ApiResponse<FriendshipResponseDTO> sendFriendRequest(@RequestBody FriendRequestDTO requestDTO,
                                                         @RequestHeader("X-User-Id") String requesterId);

    // Lời mời chờ xử lý (người khác gửi cho mình)
    @GetMapping("/api/v1/contacts/pending")
    ApiResponse<List<FriendshipResponseDTO>> getPendingRequests(@RequestHeader("X-User-Id") String userId);

    // Lời mời đã gửi (mình gửi đi)
    @GetMapping("/api/v1/contacts/sent")
    ApiResponse<List<FriendshipResponseDTO>> getSentRequests(@RequestHeader("X-User-Id") String userId);
    // Chấp nhận lời mời
    @PutMapping("/api/v1/contacts/{friendshipId}/accept")
    ApiResponse<FriendshipResponseDTO> acceptFriendRequest(@PathVariable String friendshipId,
                                                           @RequestHeader("X-User-Id") String userId);


    // Từ chối lời mời
    @DeleteMapping("/api/v1/contacts/{friendshipId}/decline")
    ApiResponse<String> declineFriendRequest(@PathVariable String friendshipId,
                                             @RequestHeader("X-User-Id") String userId);

    // Thu hồi lời mời đã gửi
    @DeleteMapping("/api/v1/contacts/request/revoke/{recipientId}")
    ApiResponse<String> revokeFriendRequest(@PathVariable String recipientId,
                                            @RequestHeader("X-User-Id") String requesterId);

    // Xóa bạn
    @DeleteMapping("/api/v1/contacts/friend/{friendId}")
    ApiResponse<String> removeFriend(@PathVariable String friendId,
                                     @RequestHeader("X-User-Id") String userId);
}