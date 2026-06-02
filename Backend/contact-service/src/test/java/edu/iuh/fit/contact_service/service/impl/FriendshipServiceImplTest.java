package edu.iuh.fit.contact_service.service.impl;

import edu.iuh.fit.common_service.exception.ForbiddenException;
import edu.iuh.fit.contact_service.entity.Friendship;
import edu.iuh.fit.contact_service.repository.FriendshipRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FriendshipServiceImplTest {

    @Mock
    private FriendshipRepository friendshipRepository; // Mock DB
    // BẠN COPY VÀ THÊM ĐÚNG 2 DÒNG NÀY VÀO NHÉ:
    @Mock
    private edu.iuh.fit.contact_service.client.UserClient userClient;
    @InjectMocks
    private FriendshipServiceImpl friendshipService; // Class cần test

    // Test Case 1: Từ chối thành công (Happy Path)
    @Test
    void testDeclineRequest_Success() {
        // 1. Arrange: Giả lập dữ liệu
        String friendshipId = "f-123";
        String currentUserId = "user-nhan";

        Friendship mockFriendship = new Friendship();
        mockFriendship.setId(friendshipId);
        mockFriendship.setRecipientId(currentUserId); // Đúng người nhận

        // Khi service tìm kiếm id này, trả về mockFriendship
        when(friendshipRepository.findById(friendshipId)).thenReturn(Optional.of(mockFriendship));

        // 2. Act: Thực hiện hàm
        friendshipService.declineRequest(friendshipId, currentUserId);

        // 3. Assert: Kiểm chứng repository.delete() đã được gọi đúng 1 lần
        verify(friendshipRepository, times(1)).delete(mockFriendship);
    }

    // Test Case 2: Kẻ gian cố tình từ chối giùm (Nghiệp vụ - Abnormal)
    @Test
    void testDeclineRequest_ThrowsForbiddenException() {
        // 1. Arrange
        String friendshipId = "f-123";
        String hackerId = "hacker-999";

        Friendship mockFriendship = new Friendship();
        mockFriendship.setId(friendshipId);
        mockFriendship.setRecipientId("nguoi-nhan-that-su"); // Không phải hacker

        when(friendshipRepository.findById(friendshipId)).thenReturn(Optional.of(mockFriendship));

        // 2 & 3. Act & Assert: Chạy hàm và kỳ vọng ném ra lỗi ForbiddenException
        assertThrows(ForbiddenException.class, () -> {
            friendshipService.declineRequest(friendshipId, hackerId);
        });

        // Kiểm chứng chắc chắn rằng hàm delete KHÔNG BAO GIỜ được gọi
        verify(friendshipRepository, never()).delete(any());
    }
}