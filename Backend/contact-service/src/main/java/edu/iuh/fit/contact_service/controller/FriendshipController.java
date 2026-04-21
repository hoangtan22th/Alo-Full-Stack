//package edu.iuh.fit.contact_service.controller;
//
//import edu.iuh.fit.common_service.dto.response.ApiResponse;
//import edu.iuh.fit.contact_service.dto.response.FriendshipResponseDTO;
//import edu.iuh.fit.contact_service.dto.request.FriendRequestDTO;
//import edu.iuh.fit.contact_service.dto.response.SearchFriendResponseDTO;
//import edu.iuh.fit.contact_service.service.ContactService;
//import lombok.RequiredArgsConstructor;
//import org.springframework.http.ResponseEntity;
//import org.springframework.web.bind.annotation.*;
//
//import java.util.List;
//
//@RestController
//@RequestMapping("/api/contacts")
//@RequiredArgsConstructor
//public class ContactController {
//
//    private final ContactService contactService;
//
//    @GetMapping("/search")
//    public ResponseEntity<ApiResponse<SearchFriendResponseDTO>> searchUserToMakeFriend(
//            @RequestParam String phone,
//            @RequestHeader("X-User-Id") String currentUserId) {
//        return ResponseEntity.ok(ApiResponse.success(contactService.searchUserByPhone(phone, currentUserId)));
//    }
//
//    @PostMapping("/request")
//    public ResponseEntity<ApiResponse<FriendshipResponseDTO>> sendRequest(
//            @RequestBody FriendRequestDTO requestDTO,
//            @RequestHeader("X-User-Id") String requesterId) {
//
//        requestDTO.setRequesterId(requesterId);
//        return ResponseEntity.ok(ApiResponse.success(contactService.sendFriendRequest(requestDTO)));
//    }
//
//    @GetMapping("/pending")
//    public ResponseEntity<ApiResponse<List<FriendshipResponseDTO>>> getPendingRequests(
//            @RequestHeader("X-User-Id") String userId) {
//        return ResponseEntity.ok(ApiResponse.success(contactService.getPendingRequests(userId)));
//    }
//
//    @GetMapping("/friends")
//    public ResponseEntity<ApiResponse<List<FriendshipResponseDTO>>> getFriendsList(
//            @RequestHeader("X-User-Id") String userId) {
//        return ResponseEntity.ok(ApiResponse.success(contactService.getFriendsList(userId)));
//    }
//
//    @PutMapping("/accept/{id}")
//    public ResponseEntity<ApiResponse<FriendshipResponseDTO>> acceptRequest(
//            @PathVariable String id,
//            @RequestHeader("X-User-Id") String userId) {
//        return ResponseEntity.ok(ApiResponse.success(contactService.acceptRequest(id, userId)));
//    }
//
//    @PutMapping("/decline/{id}")
//    public ResponseEntity<ApiResponse<String>> declineRequest(
//            @PathVariable String id,
//            @RequestHeader("X-User-Id") String userId) {
//        contactService.declineRequest(id, userId);
//        return ResponseEntity.ok(ApiResponse.success("Đã từ chối lời mời kết bạn!"));
//    }
//}

package edu.iuh.fit.contact_service.controller;

import edu.iuh.fit.common_service.dto.response.ApiResponse;
import edu.iuh.fit.contact_service.dto.response.FriendshipResponseDTO;
import edu.iuh.fit.contact_service.dto.request.FriendRequestDTO;
import edu.iuh.fit.contact_service.dto.response.SearchFriendResponseDTO;
import edu.iuh.fit.contact_service.service.FriendshipService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/contacts")
@RequiredArgsConstructor
public class FriendshipController {

    private final FriendshipService contactService;

    // Tìm kiếm: Lấy currentUserId từ Header do Gateway dập mộc
    @GetMapping("/search")
    public ResponseEntity<ApiResponse<SearchFriendResponseDTO>> searchUserToMakeFriend(
            @RequestParam String phone,
            @RequestHeader("X-User-Id") String currentUserId) {
        return ResponseEntity.ok(ApiResponse.success(contactService.searchUserByPhone(phone, currentUserId)));
    }

    // Gửi lời mời: RequesterId lấy từ Header
    @PostMapping("/request")
    public ResponseEntity<ApiResponse<FriendshipResponseDTO>> sendRequest(
            @RequestBody FriendRequestDTO requestDTO,
            @RequestHeader("X-User-Id") String requesterId) {

        requestDTO.setRequesterId(requesterId);
        return ResponseEntity.ok(ApiResponse.success(contactService.sendFriendRequest(requestDTO)));
    }

    @GetMapping("/pending")
    public ResponseEntity<ApiResponse<List<FriendshipResponseDTO>>> getPendingRequests(
            @RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(ApiResponse.success(contactService.getPendingRequests(userId)));
    }

    @GetMapping("/sent")
    public ResponseEntity<ApiResponse<List<FriendshipResponseDTO>>> getSentRequests(
            @RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(ApiResponse.success(contactService.getSentRequests(userId)));
    }

    @GetMapping("/friends")
    public ResponseEntity<ApiResponse<List<FriendshipResponseDTO>>> getFriendsList(
            @RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(ApiResponse.success(contactService.getFriendsList(userId)));
    }

    @PutMapping("/{friendshipId}/accept")
    public ResponseEntity<ApiResponse<FriendshipResponseDTO>> acceptFriendRequest(
            @PathVariable String friendshipId,
            @RequestHeader("X-User-Id") String userId) {

        FriendshipResponseDTO response = contactService.acceptRequest(friendshipId, userId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @DeleteMapping("/{friendshipId}/decline")
    public ResponseEntity<ApiResponse<String>> declineFriendRequest(
            @PathVariable String friendshipId,
            @RequestHeader("X-User-Id") String userId) {

        contactService.declineRequest(friendshipId, userId);
        return ResponseEntity.ok(ApiResponse.success("Đã từ chối lời mời kết bạn"));
    }

    @DeleteMapping("/request/revoke/{recipientId}")
    public ResponseEntity<ApiResponse<String>> revokeFriendRequest(
            @PathVariable String recipientId,
            @RequestHeader("X-User-Id") String requesterId) {

        contactService.revokeRequest(requesterId, recipientId);
        return ResponseEntity.ok(ApiResponse.success("Đã thu hồi lời mời kết bạn thành công"));
    }

    @DeleteMapping("/friend/{friendId}")
    public ResponseEntity<ApiResponse<String>> removeFriend(
            @PathVariable String friendId,
            @RequestHeader("X-User-Id") String userId) {
        // Tấn dùng chung logic xóa record trong DB giống như decline/revoke nhé
        contactService.removeFriend(userId, friendId);
        return ResponseEntity.ok(ApiResponse.success("Đã xóa bạn bè thành công"));
    }
}