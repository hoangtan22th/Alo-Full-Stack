package edu.iuh.fit.chatbot_service.config;

import edu.iuh.fit.chatbot_service.client.ContactClient;
import edu.iuh.fit.chatbot_service.dto.FriendRequestDTO;
import edu.iuh.fit.chatbot_service.dto.FriendshipResponseDTO;
import edu.iuh.fit.chatbot_service.dto.SearchFriendResponseDTO;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;
import java.util.List;

@Component
public class ContactTool {
    private final ContactClient contactClient;
    public ContactTool(ContactClient contactClient) { this.contactClient = contactClient; }

    @Tool(description = "Lấy danh sách bạn bè của người dùng hiện tại.")
    public String getFriendsList(@ToolParam(description = "ID người dùng hiện tại") String userId) {
        try {
            var response = contactClient.getFriendsList(userId);
            if (response.getData() == null || response.getData().isEmpty()) return "Bạn chưa có bạn bè nào.";
            StringBuilder sb = new StringBuilder("👥 Danh sách bạn bè:\n");
            for (FriendshipResponseDTO f : response.getData()) {
                sb.append("- ").append(f.getFriendName()).append(" (ID: ").append(f.getFriendId()).append(")\n");
            }
            return sb.toString();
        } catch (Exception e) {
            return "Lỗi khi lấy danh sách bạn bè: " + e.getMessage();
        }
    }

    @Tool(description = "Tìm kiếm người dùng theo số điện thoại để kết bạn.")
    public String searchUserByPhone(@ToolParam(description = "Số điện thoại cần tìm") String phone,
                                    @ToolParam(description = "ID người dùng hiện tại") String userId) {
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

    @Tool(description = "Gửi lời mời kết bạn đến một người dùng khác.")
    public String sendFriendRequest(@ToolParam(description = "ID người nhận") String recipientId,
                                    @ToolParam(description = "ID người gửi (người dùng hiện tại)") String requesterId) {
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
}