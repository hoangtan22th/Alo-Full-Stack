package edu.iuh.fit.contact_service.controller;

import edu.iuh.fit.common_service.dto.response.ApiResponse;
import edu.iuh.fit.contact_service.dto.response.FriendshipResponseDTO;
import edu.iuh.fit.contact_service.dto.request.FriendRequestDTO;
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

    @PostMapping("/request")
    public ResponseEntity<ApiResponse<edu.iuh.fit.contact_service.dto.response.FriendshipResponseDTO>> sendRequest(@RequestBody FriendRequestDTO requestDTO) {
        return ResponseEntity.ok(ApiResponse.success(contactService.sendFriendRequest(requestDTO)));
    }

    @GetMapping("/pending")
    public ResponseEntity<ApiResponse<List<FriendshipResponseDTO>>> getPendingRequests(@RequestParam String userId) {
        return ResponseEntity.ok(ApiResponse.success(contactService.getPendingRequests(userId)));
    }

    @GetMapping("/friends")
    public ResponseEntity<ApiResponse<List<FriendshipResponseDTO>>> getFriendsList(@RequestParam String userId) {
        return ResponseEntity.ok(ApiResponse.success(contactService.getFriendsList(userId)));
    }

    @PutMapping("/accept/{id}")
    public ResponseEntity<ApiResponse<FriendshipResponseDTO>> acceptRequest(@PathVariable String id, @RequestParam String userId) {
        return ResponseEntity.ok(ApiResponse.success(contactService.acceptRequest(id, userId)));
    }

    @PutMapping("/decline/{id}")
    public ResponseEntity<ApiResponse<String>> declineRequest(@PathVariable String id, @RequestParam String userId) {
        contactService.declineRequest(id, userId);
        return ResponseEntity.ok(ApiResponse.success("Đã từ chối lời mời kết bạn!"));
    }
}