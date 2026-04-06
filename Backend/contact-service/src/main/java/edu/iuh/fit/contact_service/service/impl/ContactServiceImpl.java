package edu.iuh.fit.contact_service.service.impl;

import edu.iuh.fit.common_service.dto.response.ApiResponse;
import edu.iuh.fit.common_service.exception.AppException;
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
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
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
            throw new ResourceNotFoundException("Không tìm thấy người dùng!");
        }

        UserDTO foundUser = userResponse.getData();
        String foundUserId = foundUser.getId();

        if (foundUserId.equals(currentUserId)) {
            throw new AppException(400, "Bạn không thể tự tìm chính mình!");
        }

        // Kiểm tra quan hệ 2 chiều từ Database
        Optional<Friendship> friendshipOpt = friendshipRepository.findByUserIds(currentUserId, foundUserId);

        String status = "NOT_FRIEND";
        if (friendshipOpt.isPresent()) {
            Friendship f = friendshipOpt.get();
            if (f.getStatus() == FriendshipStatus.ACCEPTED) {
                status = "ACCEPTED";
            } else if (f.getRequesterId().equals(currentUserId)) {
                // Trường hợp: Tấn là người gửi
                status = "YOU_SENT_REQUEST";
            } else {
                // Trường hợp: Người kia gửi cho Tấn
                status = "THEY_SENT_REQUEST";
            }
        }

        return SearchFriendResponseDTO.builder()
                .userId(foundUserId)
                .fullName(foundUser.getFullName())
                .avatarUrl(foundUser.getAvatar())
                .phone(foundUser.getPhoneNumber())
                .relationStatus(status)
                .build();
    }

    @Override
    @Transactional
    public FriendshipResponseDTO sendFriendRequest(FriendRequestDTO dto) {
        // 1. Kiểm tra tồn tại quan hệ (check 2 chiều)
        Optional<Friendship> existing = friendshipRepository.findByUserIds(dto.getRequesterId(), dto.getRecipientId());
        if (existing.isPresent()) {
            throw new DuplicateResourceException("Lời mời hoặc quan hệ bạn bè đã tồn tại!");
        }

        // 2. Lưu lời mời mới
        Friendship friendship = Friendship.builder()

                .requesterId(dto.getRequesterId())
                .recipientId(dto.getRecipientId())
                .greetingMessage(dto.getGreetingMessage())
                .status(FriendshipStatus.PENDING)
                .build();

        Friendship saved = friendshipRepository.save(friendship);

        // 3. Làm giàu dữ liệu để trả về UI ngay lập tức
        List<UserDTO> users = userClient.getUsersByIds(List.of(dto.getRequesterId(), dto.getRecipientId()));
        FriendshipResponseDTO responseDTO = mapToDTO(saved);

        users.stream()
                .filter(u -> u.getId().equals(dto.getRequesterId()))
                .findFirst()
                .ifPresent(u -> {
                    responseDTO.setRequesterName(u.getFullName());
                    responseDTO.setRequesterAvatar(u.getAvatar());
                });

        return responseDTO;
    }

    @Override
    public List<FriendshipResponseDTO> getPendingRequests(String userId) {
        List<Friendship> requests = friendshipRepository.findByRecipientIdAndStatus(userId, FriendshipStatus.PENDING);
        if (requests.isEmpty()) return List.of();

        List<String> requesterIds = requests.stream()
                .map(Friendship::getRequesterId)
                .collect(Collectors.toList());

        List<UserDTO> userInfos = userClient.getUsersByIds(requesterIds);

        return requests.stream().map(req -> {
            FriendshipResponseDTO dto = mapToDTO(req);
            userInfos.stream()
                    .filter(u -> u.getId().equals(req.getRequesterId()))
                    .findFirst()
                    .ifPresent(u -> {
                        dto.setRequesterName(u.getFullName());
                        dto.setRequesterAvatar(u.getAvatar()); // Fix: Đồng bộ getAvatar()
                    });
            return dto;
        }).collect(Collectors.toList());
    }

    @Override
    public List<FriendshipResponseDTO> getFriendsList(String userId) {
        List<Friendship> friends = friendshipRepository.findFriendsByUserId(userId);
        if (friends.isEmpty()) return List.of();

        // Lấy ID của đối phương
        List<String> friendIds = friends.stream()
                .map(f -> f.getRequesterId().equals(userId) ? f.getRecipientId() : f.getRequesterId())
                .collect(Collectors.toList());

        List<UserDTO> userInfos = userClient.getUsersByIds(friendIds);

        return friends.stream().map(f -> {
            FriendshipResponseDTO dto = mapToDTO(f);
            String targetId = f.getRequesterId().equals(userId) ? f.getRecipientId() : f.getRequesterId();

            userInfos.stream()
                    .filter(u -> u.getId().equals(targetId))
                    .findFirst()
                    .ifPresent(u -> {
                        dto.setRequesterName(u.getFullName());
                        dto.setRequesterAvatar(u.getAvatar()); // Fix: Đồng bộ getAvatar()
                    });
            return dto;
        }).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public FriendshipResponseDTO acceptRequest(String friendshipId, String userId) {
        Friendship friendship = friendshipRepository.findById(friendshipId)
                .orElseThrow(() -> new ResourceNotFoundException("Lời mời", "id", friendshipId));

        if (!friendship.getRecipientId().equals(userId)) {
            throw new ForbiddenException("Bạn không có quyền chấp nhận lời mời này!");
        }

        friendship.setStatus(FriendshipStatus.ACCEPTED);
        return mapToDTO(friendshipRepository.save(friendship));
    }

    @Override
    @Transactional
    public void declineRequest(String friendshipId, String userId) {
        Friendship friendship = friendshipRepository.findById(friendshipId)
                .orElseThrow(() -> new ResourceNotFoundException("Lời mời", "id", friendshipId));

        if (!friendship.getRecipientId().equals(userId)) {
            throw new ForbiddenException("Bạn không có quyền từ chối lời mời này!");
        }

        // Xóa để người dùng có thể gửi lại lời mời sau này
        friendshipRepository.delete(friendship);
    }

    private FriendshipResponseDTO mapToDTO(Friendship friendship) {
        return FriendshipResponseDTO.builder()
                .id(friendship.getId())
                .requesterId(friendship.getRequesterId())
                .recipientId(friendship.getRecipientId())
                .greetingMessage(friendship.getGreetingMessage())
                .status(friendship.getStatus().toString())
                .build();
    }
}