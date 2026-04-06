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
import edu.iuh.fit.contact_service.service.ContactService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/contacts")
@RequiredArgsConstructor
public class ContactController {

    private final ContactService contactService;

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<SearchFriendResponseDTO>> searchUserToMakeFriend(
            @RequestParam String phone,
            @RequestParam String currentUserId) {
        return ResponseEntity.ok(ApiResponse.success(contactService.searchUserByPhone(phone, currentUserId)));
    }

    @PostMapping("/request")
    public ResponseEntity<ApiResponse<FriendshipResponseDTO>> sendRequest(
            @RequestBody FriendRequestDTO requestDTO) {
        // Frontend sẽ truyền sẵn 2 trường requesterId và recipientId nằm ngay trong cục JSON body
        return ResponseEntity.ok(ApiResponse.success(contactService.sendFriendRequest(requestDTO)));
    }

    @GetMapping("/pending")
    public ResponseEntity<ApiResponse<List<FriendshipResponseDTO>>> getPendingRequests(
            @RequestParam String userId) {
        return ResponseEntity.ok(ApiResponse.success(contactService.getPendingRequests(userId)));
    }

    @GetMapping("/friends")
    public ResponseEntity<ApiResponse<List<FriendshipResponseDTO>>> getFriendsList(
            @RequestParam String userId) {
        return ResponseEntity.ok(ApiResponse.success(contactService.getFriendsList(userId)));
    }

    @PutMapping("/accept/{id}")
    public ResponseEntity<ApiResponse<FriendshipResponseDTO>> acceptRequest(
            @PathVariable String id,
            @RequestParam String userId) {
        return ResponseEntity.ok(ApiResponse.success(contactService.acceptRequest(id, userId)));
    }

    @PutMapping("/decline/{id}")
    public ResponseEntity<ApiResponse<String>> declineRequest(
            @PathVariable String id,
            @RequestParam String userId) {
        contactService.declineRequest(id, userId);
        return ResponseEntity.ok(ApiResponse.success("Đã từ chối lời mời kết bạn!"));
    }
}