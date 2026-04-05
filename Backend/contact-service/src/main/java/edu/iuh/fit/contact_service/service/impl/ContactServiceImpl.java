package edu.iuh.fit.contact_service.service.impl;

import edu.iuh.fit.contact_service.dto.FriendRequestDTO;
import edu.iuh.fit.contact_service.entity.Friendship;
import edu.iuh.fit.contact_service.enums.FriendshipStatus;
import edu.iuh.fit.contact_service.repository.FriendshipRepository;
import edu.iuh.fit.contact_service.service.ContactService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ContactServiceImpl implements ContactService {

    private final FriendshipRepository friendshipRepository;

    @Override
    public Friendship sendFriendRequest(FriendRequestDTO dto) {

        if (friendshipRepository.existsByRequesterIdAndRecipientId(dto.getRequesterId(), dto.getRecipientId())) {
            throw new RuntimeException("Lời mời đã được gửi trước đó!");
        }

        Friendship friendship = new Friendship();
        friendship.setRequesterId(dto.getRequesterId());
        friendship.setRecipientId(dto.getRecipientId());
        friendship.setGreetingMessage(dto.getGreetingMessage());

        // Mặc định cứ kết bạn là trạng thái PENDING
        friendship.setStatus(FriendshipStatus.PENDING);

        return friendshipRepository.save(friendship);
    }
    @Override
    public List<Friendship> getPendingRequests(String userId) {
        return friendshipRepository.findByRecipientIdAndStatus(userId, FriendshipStatus.PENDING);
    }

    @Override
    public List<Friendship> getFriendsList(String userId) {
        return friendshipRepository.findFriendsByUserId(userId);
    }

    @Override
    public Friendship acceptRequest(String friendshipId, String userId) {

        Friendship friendship = friendshipRepository.findById(friendshipId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy lời mời này!"));

        // Bảo mật: Check xem người đang bấm "Đồng ý" có đúng là người được nhận lời mời không
        if (!friendship.getRecipientId().equals(userId)) {
            throw new RuntimeException("Bạn không có quyền đồng ý lời mời này!");
        }

        // Đổi trạng thái
        friendship.setStatus(FriendshipStatus.ACCEPTED);
        return friendshipRepository.save(friendship);
    }

    @Override
    public void declineRequest(String friendshipId, String userId) {
        Friendship friendship = friendshipRepository.findById(friendshipId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy lời mời này!"));

        if (!friendship.getRecipientId().equals(userId)) {
            throw new RuntimeException("Bạn không có quyền từ chối lời mời này!");
        }

        // Từ chối thì có 2 cách: 1 là xóa luôn record, 2 là đổi status thành DECLINED.

        friendship.setStatus(FriendshipStatus.DECLINED);
        friendshipRepository.save(friendship);
    }
}