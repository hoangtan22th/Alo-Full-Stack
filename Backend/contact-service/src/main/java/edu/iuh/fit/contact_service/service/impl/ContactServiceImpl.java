package edu.iuh.fit.contact_service.service.impl;

import edu.iuh.fit.common_service.exception.DuplicateResourceException;
import edu.iuh.fit.common_service.exception.ForbiddenException;
import edu.iuh.fit.common_service.exception.ResourceNotFoundException;
import edu.iuh.fit.contact_service.dto.request.FriendRequestDTO;
import edu.iuh.fit.contact_service.dto.response.FriendshipResponseDTO;
import edu.iuh.fit.contact_service.entity.Friendship;
import edu.iuh.fit.contact_service.enums.FriendshipStatus;
import edu.iuh.fit.contact_service.repository.FriendshipRepository;
import edu.iuh.fit.contact_service.service.ContactService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ContactServiceImpl implements ContactService {

    private final FriendshipRepository friendshipRepository;

    @Override
    public FriendshipResponseDTO sendFriendRequest(FriendRequestDTO dto) {
        if (friendshipRepository.existsByRequesterIdAndRecipientId(dto.getRequesterId(), dto.getRecipientId())) {
            // Thay vì RuntimeException -> Dùng lỗi 409
            throw new DuplicateResourceException("Lời mời kết bạn giữa hai người đã tồn tại!");
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
                // Thay vì RuntimeException -> Dùng lỗi 404
                .orElseThrow(() -> new ResourceNotFoundException("Lời mời kết bạn", "id", friendshipId));

        if (!friendship.getRecipientId().equals(userId)) {
            // Thay vì RuntimeException -> Dùng lỗi 403
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

        friendship.setStatus(FriendshipStatus.DECLINED);
        friendshipRepository.save(friendship);
    }

    // Hàm tiện ích map Entity -> DTO
    private edu.iuh.fit.contact_service.dto.response.FriendshipResponseDTO mapToDTO(Friendship friendship) {
        return edu.iuh.fit.contact_service.dto.response.FriendshipResponseDTO.builder()
                .id(friendship.getId())
                .requesterId(friendship.getRequesterId())
                .recipientId(friendship.getRecipientId())
                .greetingMessage(friendship.getGreetingMessage())
                .status(friendship.getStatus())
                .build();
    }
}