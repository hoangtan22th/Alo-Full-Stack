package com.alochat.contactservice.service;

import com.alochat.contactservice.dto.FriendRequestDTO;
import com.alochat.contactservice.entity.Friendship;

import java.util.List;

public interface ContactService {
    Friendship sendFriendRequest(FriendRequestDTO dto);
    List<Friendship> getPendingRequests(String userId); // Xem lời mời
    List<Friendship> getFriendsList(String userId);     // Xem danh sách bạn
    Friendship acceptRequest(String friendshipId, String userId); // Đồng ý
    void declineRequest(String friendshipId, String userId);      // Từ chối
}