package edu.iuh.fit.contact_service.service.impl;

import edu.iuh.fit.common_service.dto.response.ApiResponse;
import edu.iuh.fit.common_service.exception.DuplicateResourceException;
import edu.iuh.fit.common_service.exception.ForbiddenException;
import edu.iuh.fit.common_service.exception.ResourceNotFoundException;
import edu.iuh.fit.contact_service.client.UserClient;
import edu.iuh.fit.contact_service.dto.request.FriendRequestDTO;
import edu.iuh.fit.contact_service.dto.response.FriendshipResponseDTO;
import edu.iuh.fit.contact_service.dto.response.SearchFriendResponseDTO;
import edu.iuh.fit.contact_service.dto.response.UserDTO;
import edu.iuh.fit.contact_service.entity.Friendship;
import edu.iuh.fit.contact_service.enums.FriendshipStatus;
import edu.iuh.fit.contact_service.repository.FriendshipRepository;
import edu.iuh.fit.contact_service.service.ContactService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ContactServiceImpl implements ContactService {
    private final UserClient userClient;
    private final FriendshipRepository friendshipRepository;

    @Override
    public SearchFriendResponseDTO searchUserByPhone(String phone, String currentUserId) {
        ApiResponse<UserDTO> userResponse = userClient.getUserByPhone(phone);

        if (userResponse == null || userResponse.getData() == null) {
            throw new RuntimeException("Không tìm thấy người dùng với số điện thoại này!");
        }

        UserDTO foundUser = userResponse.getData();
        String foundUserId = foundUser.getId();

        if (foundUserId.equals(currentUserId)) {
            throw new RuntimeException("Bạn không thể tìm kiếm chính mình để kết bạn!");
        }

        Optional<Friendship> friendship = friendshipRepository.findByUserIds(currentUserId, foundUserId);

        String status = "NOT_FRIEND";
        if (friendship.isPresent()) {
            status = friendship.get().getStatus().toString();
        }

        return SearchFriendResponseDTO.builder()
                .userId(foundUserId)
                .fullName(foundUser.getFullName())
                .avatarUrl(foundUser.getAvatarUrl())
                .phone(foundUser.getPhone())
                .relationStatus(status)
                .build();
    }

    @Override
    public FriendshipResponseDTO sendFriendRequest(FriendRequestDTO dto) {
        // Kiểm tra xem đã kết bạn hoặc đang chờ hay chưa (cả 2 chiều)
        Optional<Friendship> existing = friendshipRepository.findByUserIds(dto.getRequesterId(), dto.getRecipientId());
        if (existing.isPresent()) {
            throw new DuplicateResourceException("Quan hệ hoặc lời mời kết bạn giữa hai người đã tồn tại!");
        }

        Friendship friendship = new Friendship();
        friendship.setRequesterId(dto.getRequesterId());
        friendship.setRecipientId(dto.getRecipientId());
        friendship.setGreetingMessage(dto.getGreetingMessage());
        friendship.setStatus(FriendshipStatus.PENDING);

        Friendship savedFriendship = friendshipRepository.save(friendship);
        return mapToDTO(savedFriendship);
    }

    @Override
    public List<FriendshipResponseDTO> getPendingRequests(String userId) {
        return friendshipRepository.findByRecipientIdAndStatus(userId, FriendshipStatus.PENDING)
                .stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    public List<FriendshipResponseDTO> getFriendsList(String userId) {
        return friendshipRepository.findFriendsByUserId(userId)
                .stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    public FriendshipResponseDTO acceptRequest(String friendshipId, String userId) {
        Friendship friendship = friendshipRepository.findById(friendshipId)
                .orElseThrow(() -> new ResourceNotFoundException("Lời mời kết bạn", "id", friendshipId));

        if (!friendship.getRecipientId().equals(userId)) {
            throw new ForbiddenException("Bạn không có quyền đồng ý lời mời này!");
        }

        friendship.setStatus(FriendshipStatus.ACCEPTED);
        return mapToDTO(friendshipRepository.save(friendship));
    }

    @Override
    public void declineRequest(String friendshipId, String userId) {
        Friendship friendship = friendshipRepository.findById(friendshipId)
                .orElseThrow(() -> new ResourceNotFoundException("Lời mời kết bạn", "id", friendshipId));

        if (!friendship.getRecipientId().equals(userId)) {
            throw new ForbiddenException("Bạn không có quyền từ chối lời mời này!");
        }

        // Tùy ông, có thể đổi status thành DECLINED hoặc xóa luôn record (friendshipRepository.delete(friendship))
        friendship.setStatus(FriendshipStatus.valueOf("DECLINED")); // Giả định enum của ông có chữ DECLINED
        friendshipRepository.save(friendship);
    }

    private FriendshipResponseDTO mapToDTO(Friendship friendship) {
        return FriendshipResponseDTO.builder()
                .id(friendship.getId())
                .requesterId(friendship.getRequesterId())
                .recipientId(friendship.getRecipientId())
                .greetingMessage(friendship.getGreetingMessage())
                .status(friendship.getStatus())
                .build();
    }
}