package edu.iuh.fit.contact_service.service;

import edu.iuh.fit.contact_service.dto.request.FriendRequestDTO;
import edu.iuh.fit.contact_service.dto.response.FriendshipResponseDTO;
import edu.iuh.fit.contact_service.dto.response.SearchFriendResponseDTO;
import edu.iuh.fit.contact_service.entity.Friendship;

import java.util.List;

public interface ContactService {
    FriendshipResponseDTO sendFriendRequest(FriendRequestDTO dto);
    List<FriendshipResponseDTO> getPendingRequests(String userId); // Xem lời mời
    List<FriendshipResponseDTO> getFriendsList(String userId);     // Xem danh sách bạn
    FriendshipResponseDTO acceptRequest(String friendshipId, String userId); // Đồng ý
    void declineRequest(String friendshipId, String userId);
    SearchFriendResponseDTO searchUserByPhone(String phone, String currentUserId);// Từ chối
}