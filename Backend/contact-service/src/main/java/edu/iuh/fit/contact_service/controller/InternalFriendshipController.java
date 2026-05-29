package edu.iuh.fit.contact_service.controller;

import edu.iuh.fit.common_service.dto.response.ApiResponse;
import edu.iuh.fit.contact_service.dto.response.InternalFriendshipStatsResponse;
import edu.iuh.fit.contact_service.service.FriendshipService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/internal/contacts")
@RequiredArgsConstructor
public class InternalFriendshipController {

    private final FriendshipService friendshipService;

    @GetMapping("/stats/yesterday")
    public ResponseEntity<ApiResponse<InternalFriendshipStatsResponse>> getYesterdayStats(@RequestParam("userId") String userId) {
        long newFriends = friendshipService.countNewFriendsAddedYesterday(userId);
        InternalFriendshipStatsResponse response = InternalFriendshipStatsResponse.builder()
                .newFriendsAdded(newFriends)
                .totalCallMinutes(0) // Hardcoded 0 as contact-service does not handle call history
                .build();
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
