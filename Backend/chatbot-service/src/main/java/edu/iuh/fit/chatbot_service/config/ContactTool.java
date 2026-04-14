package edu.iuh.fit.chatbot_service.config;

import edu.iuh.fit.chatbot_service.client.ContactClient;
import edu.iuh.fit.chatbot_service.client.UserClient;
import edu.iuh.fit.chatbot_service.dto.FriendRequestDTO;
import edu.iuh.fit.chatbot_service.dto.FriendshipResponseDTO;
import edu.iuh.fit.chatbot_service.dto.SearchFriendResponseDTO;
import edu.iuh.fit.chatbot_service.dto.UserDto;
import edu.iuh.fit.common_service.dto.response.ApiResponse;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;
import java.util.List;

@Component
public class ContactTool {
    private final ContactClient contactClient;
    private final UserClient userClient;

    public ContactTool(ContactClient contactClient, UserClient userClient) {
        this.contactClient = contactClient;
        this.userClient = userClient;
    }

    @Tool(description = "Lấy danh sách bạn bè của người dùng hiện tại.")
    public String getFriendsList(@ToolParam(description = "ID người dùng hiện tại") String userId) {
        System.out.println(">>> [TOOL CALLED] getFriendsList - userId: " + userId);
        try {
            var response = contactClient.getFriendsList(userId);
            if (response.getData() == null || response.getData().isEmpty()) {
                return "Bạn chưa có bạn bè nào.";
            }
            StringBuilder sb = new StringBuilder("👥 Danh sách bạn bè:\n");
            for (FriendshipResponseDTO f : response.getData()) {
                // Xác định tên người bạn (không phải mình)
                String friendName;
                if (f.getRequesterId().equals(userId)) {
                    friendName = f.getRecipientName();
                } else {
                    friendName = f.getRequesterName();
                }
                if (friendName == null || friendName.isBlank()) {
                    friendName = "ID " + (f.getRequesterId().equals(userId) ? f.getRecipientId() : f.getRequesterId());
                }
                sb.append("- ").append(friendName).append("\n");
            }
            return sb.toString();
        } catch (Exception e) {
            return "Lỗi khi lấy danh sách bạn bè: " + e.getMessage();
        }
    }

    @Tool(description = "Lấy danh sách lời mời kết bạn đã gửi của người dùng hiện tại.")
    public String getSentRequests(@ToolParam(description = "ID người dùng hiện tại") String userId) {
        System.out.println(">>> [TOOL CALLED] getSentRequests - userId: " + userId);
        try {
            var response = contactClient.getSentRequests(userId);
            if (response.getData() == null || response.getData().isEmpty()) {
                return "Bạn chưa gửi lời mời kết bạn cho ai.";
            }
            StringBuilder sb = new StringBuilder("📨 Danh sách lời mời đã gửi:\n");
            for (FriendshipResponseDTO f : response.getData()) {
                String friendName = (f.getRecipientName() != null && !f.getRecipientName().isBlank())
                        ? f.getRecipientName()
                        : "ID " + f.getRecipientId();
                sb.append("- Đã gửi đến: ").append(friendName)
                        .append(", trạng thái: ").append(f.getStatus()).append("\n");
            }
            return sb.toString();
        } catch (Exception e) {
            return "Lỗi khi lấy danh sách lời mời đã gửi: " + e.getMessage();
        }
    }


    @Tool(description = "Tìm kiếm người dùng theo số điện thoại để kết bạn.")
    public String searchUserByPhone(@ToolParam(description = "Số điện thoại cần tìm") String phone,
                                    @ToolParam(description = "ID người dùng hiện tại") String userId) {
        System.out.println(">>> [TOOL CALLED] searchUserByPhone - phone: " + phone + ", userId: " + userId);
        try {
            var response = contactClient.searchUserByPhone(phone, userId);
            SearchFriendResponseDTO data = response.getData();
            if (data == null) return "Không tìm thấy người dùng với số điện thoại " + phone;
            return "📱 Tìm thấy: " + data.getFullName() + " (" + data.getPhoneNumber() + "). " +
                    (data.isFriend() ? "Các bạn đã là bạn bè." : "Chưa là bạn bè.");
        } catch (Exception e) {
            return "Lỗi tìm kiếm: " + e.getMessage();
        }
    }

    @Tool(description = "Gửi lời mời kết bạn bằng số điện thoại. Tự động tìm userId từ số điện thoại rồi gửi lời mời.")
    public String sendFriendRequestByPhone(@ToolParam(description = "Số điện thoại của người muốn kết bạn") String phone,
                                           @ToolParam(description = "ID người dùng hiện tại") String requesterId) {
        System.out.println(">>> [TOOL CALLED] sendFriendRequestByPhone - phone: " + phone + ", requesterId: " + requesterId);
        // Bước 1: Tìm userId từ số điện thoại
        try {
            var searchResp = contactClient.searchUserByPhone(phone, requesterId);
            SearchFriendResponseDTO data = searchResp.getData();
            if (data == null) return "Không tìm thấy người dùng với số điện thoại " + phone;
            if (data.isFriend()) return "Người dùng " + data.getFullName() + " đã là bạn bè của bạn.";
            String recipientId = data.getUserId();
            // Bước 2: Gửi lời mời
            FriendRequestDTO dto = new FriendRequestDTO();
            dto.setRecipientId(recipientId);
            dto.setRequesterId(requesterId);
            var response = contactClient.sendFriendRequest(dto, requesterId);
            if (response.getData() != null) {
                return "✅ Đã gửi lời mời kết bạn đến " + data.getFullName() + " (số điện thoại " + phone + ") thành công!";
            } else {
                return "Không thể gửi lời mời: " + response.getMessage();
            }
        } catch (Exception e) {
            return "Lỗi khi gửi lời mời: " + e.getMessage();
        }
    }

    // Giữ lại method cũ (gửi bằng ID) nếu cần
    @Tool(description = "Gửi lời mời kết bạn bằng ID người dùng (chỉ dùng khi đã biết ID).")
    public String sendFriendRequestById(@ToolParam(description = "ID người nhận") String recipientId,
                                        @ToolParam(description = "ID người gửi") String requesterId) {
        System.out.println(">>> [TOOL CALLED] sendFriendRequestById - recipientId: " + recipientId + ", requesterId: " + requesterId);
        FriendRequestDTO dto = new FriendRequestDTO();
        dto.setRecipientId(recipientId);
        dto.setRequesterId(requesterId);
        try {
            var response = contactClient.sendFriendRequest(dto, requesterId);
            if (response.getData() != null) return "✅ Đã gửi lời mời kết bạn thành công!";
            else return "Không thể gửi lời mời: " + response.getMessage();
        } catch (Exception e) {
            return "Lỗi khi gửi lời mời: " + e.getMessage();
        }
    }
    @Tool(description = "Lấy danh sách lời mời kết bạn mà người khác gửi đến cho người dùng hiện tại.")
    public String getPendingRequests(@ToolParam(description = "ID người dùng hiện tại") String userId) {
        System.out.println(">>> [TOOL CALLED] getPendingRequests - userId: " + userId);
        try {
            var response = contactClient.getPendingRequests(userId);
            if (response.getData() == null || response.getData().isEmpty()) {
                return "Hiện tại không có ai gửi lời mời kết bạn cho bạn.";
            }
            StringBuilder sb = new StringBuilder("📨 Danh sách lời mời đã nhận:\n");
            for (FriendshipResponseDTO f : response.getData()) {
                String requesterName = (f.getRequesterName() != null && !f.getRequesterName().isBlank())
                        ? f.getRequesterName()
                        : "ID " + f.getRequesterId();
                sb.append("- ").append(requesterName).append(" đã gửi lời mời, trạng thái: ").append(f.getStatus()).append("\n");
            }
            return sb.toString();
        } catch (Exception e) {
            return "Lỗi khi lấy danh sách lời mời: " + e.getMessage();
        }
    }
}