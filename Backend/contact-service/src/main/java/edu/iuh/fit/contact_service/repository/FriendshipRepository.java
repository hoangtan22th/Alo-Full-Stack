package edu.iuh.fit.contact_service.repository;

import edu.iuh.fit.contact_service.entity.Friendship;
import edu.iuh.fit.contact_service.enums.FriendshipStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FriendshipRepository extends JpaRepository<Friendship, String> {

    boolean existsByRequesterIdAndRecipientId(String requesterId, String recipientId);

    // 1. Lấy danh sách những người gửi lời mời cho mình (PENDING)
    List<Friendship> findByRecipientIdAndStatus(String recipientId, FriendshipStatus status);

    // 2. Lấy danh sách bạn bè chính thức (ACCEPTED)
    @Query("SELECT f FROM Friendship f WHERE (f.requesterId = :userId OR f.recipientId = :userId) AND f.status = 'ACCEPTED'")
    List<Friendship> findFriendsByUserId(@Param("userId") String userId);

    // 3. Kiểm tra quan hệ 2 người bất kỳ (Dùng cho tính năng Tìm kiếm)
    @Query("SELECT f FROM Friendship f WHERE (f.requesterId = :id1 AND f.recipientId = :id2) OR (f.requesterId = :id2 AND f.recipientId = :id1)")
    Optional<Friendship> findByUserIds(@Param("id1") String id1, @Param("id2") String id2);
}