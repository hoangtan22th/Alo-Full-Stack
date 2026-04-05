package edu.iuh.fit.contact_service.controller;

import edu.iuh.fit.contact_service.dto.FriendRequestDTO;
import edu.iuh.fit.contact_service.entity.Friendship;
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
    public ResponseEntity<Friendship> sendRequest(@RequestBody FriendRequestDTO requestDTO) {
        return ResponseEntity.ok(contactService.sendFriendRequest(requestDTO));
    }

    // 1. Lấy danh sách lời mời chờ xác nhận (GET /api/contacts/pending?userId=user-mai-002)
    @GetMapping("/pending")
    public ResponseEntity<List<Friendship>> getPendingRequests(@RequestParam String userId) {
        return ResponseEntity.ok(contactService.getPendingRequests(userId));
    }

    // 2. Lấy danh sách bạn bè chính thức (GET /api/contacts/friends?userId=user-tan-001)
    @GetMapping("/friends")
    public ResponseEntity<List<Friendship>> getFriendsList(@RequestParam String userId) {
        return ResponseEntity.ok(contactService.getFriendsList(userId));
    }

    // 3. Đồng ý kết bạn (PUT /api/contacts/accept/{id}?userId=user-mai-002)
    @PutMapping("/accept/{id}")
    public ResponseEntity<Friendship> acceptRequest(@PathVariable String id, @RequestParam String userId) {
        return ResponseEntity.ok(contactService.acceptRequest(id, userId));
    }

    // 4. Từ chối kết bạn (PUT /api/contacts/decline/{id}?userId=user-mai-002)
    @PutMapping("/decline/{id}")
    public ResponseEntity<String> declineRequest(@PathVariable String id, @RequestParam String userId) {
        contactService.declineRequest(id, userId);
        return ResponseEntity.ok("Đã từ chối lời mời kết bạn!");
    }
}