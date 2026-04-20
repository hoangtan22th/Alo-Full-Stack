package edu.iuh.fit.chatbot_service.config;

import edu.iuh.fit.chatbot_service.client.ContactClient;
import edu.iuh.fit.chatbot_service.client.UserClient;
import edu.iuh.fit.chatbot_service.dto.FriendRequestDTO;
import edu.iuh.fit.chatbot_service.dto.FriendshipResponseDTO;
import edu.iuh.fit.chatbot_service.dto.SearchFriendResponseDTO;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

@Component
public class ContactTool {
    private final ContactClient contactClient;
    private final UserClient userClient;

    public ContactTool(ContactClient contactClient, UserClient userClient) {
        this.contactClient = contactClient;
        this.userClient = userClient;
    }

    @Tool(description = "Lấy danh sách bạn bè hiện tại.")
    public String getFriendsList(@ToolParam(description = "Mã userId hệ thống", required = true) String userId) {
        System.out.println(">>> [TOOL] getFriendsList - userId: " + userId);
        try {
            var response = contactClient.getFriendsList(userId);
            if (response.getData() == null || response.getData().isEmpty()) return "Bạn chưa có bạn bè nào.";

            StringBuilder sb = new StringBuilder("Danh sách bạn bè hiện tại:\n");
            for (FriendshipResponseDTO f : response.getData()) {
                String friendName = f.getRequesterId().equals(userId) ? f.getRecipientName() : f.getRequesterName();
                if (friendName == null || friendName.isBlank()) {
                    friendName = "ID " + (f.getRequesterId().equals(userId) ? f.getRecipientId() : f.getRequesterId());
                }
                sb.append("- ").append(friendName).append("\n");
            }
            return sb.toString();
        } catch (Exception e) { return "Lỗi: " + e.getMessage(); }
    }

    @Tool(description = "Xem lời mời kết bạn ĐÃ GỬI.")
    public String getSentRequests(@ToolParam(description = "Mã userId hệ thống", required = true) String userId) {
        try {
            var response = contactClient.getSentRequests(userId);
            if (response.getData() == null || response.getData().isEmpty()) return "Bạn chưa gửi lời mời nào.";
            StringBuilder sb = new StringBuilder("Lời mời đã gửi:\n");
            for (FriendshipResponseDTO f : response.getData()) {
                String name = (f.getRecipientName() != null) ? f.getRecipientName() : "ID " + f.getRecipientId();
                sb.append("- Gửi đến: ").append(name).append(" (").append(f.getStatus()).append(")\n");
            }
            return sb.toString();
        } catch (Exception e) { return "Lỗi: " + e.getMessage(); }
    }

    @Tool(description = "Xem lời mời kết bạn ĐÃ NHẬN.")
    public String getPendingRequests(@ToolParam(description = "Mã userId hệ thống", required = true) String userId) {
        try {
            var response = contactClient.getPendingRequests(userId);
            if (response.getData() == null || response.getData().isEmpty()) return "Không có lời mời nào đang chờ.";
            StringBuilder sb = new StringBuilder("Lời mời đã nhận:\n");
            for (FriendshipResponseDTO f : response.getData()) {
                String name = (f.getRequesterName() != null) ? f.getRequesterName() : "ID " + f.getRequesterId();
                sb.append("- ").append(name).append(" đang chờ bạn đồng ý.\n");
            }
            return sb.toString();
        } catch (Exception e) { return "Lỗi: " + e.getMessage(); }
    }

    @Tool(description = "Tìm người dùng qua số điện thoại.")
    public String searchUserByPhone(@ToolParam(description = "Số điện thoại", required = true) String phone,
                                    @ToolParam(description = "Mã userId hệ thống", required = true) String userId) {
        try {
            var response = contactClient.searchUserByPhone(phone, userId);
            SearchFriendResponseDTO data = response.getData();
            if (data == null) return "Không tìm thấy người dùng có số " + phone;
            return "Tìm thấy: " + data.getFullName() + ". Trạng thái: " + (data.isFriend() ? "Đã là bạn." : "Chưa kết bạn.");
        } catch (Exception e) { return "Lỗi: " + e.getMessage(); }
    }

    @Tool(description = "Gửi lời mời kết bạn.")
    public String sendFriendRequestByPhone(@ToolParam(description = "Số điện thoại", required = true) String phone,
                                           @ToolParam(description = "Mã userId hệ thống", required = true) String userId) {
        try {
            var searchResp = contactClient.searchUserByPhone(phone, userId);
            SearchFriendResponseDTO data = searchResp.getData();
            if (data == null) return "Không tìm thấy số " + phone;

            FriendRequestDTO dto = new FriendRequestDTO();
            dto.setRecipientId(data.getUserId());
            dto.setRequesterId(userId);

            var response = contactClient.sendFriendRequest(dto, userId);
            return response.getData() != null ? "Đã gửi lời mời đến " + data.getFullName() : "Lỗi: " + response.getMessage();
        } catch (Exception e) { return "Lỗi: " + e.getMessage(); }
    }

    @Tool(description = "Chấp nhận lời mời kết bạn.")
    public String acceptFriendRequestByPhone(@ToolParam(description = "Số điện thoại người gửi", required = true) String phone,
                                             @ToolParam(description = "Mã userId hệ thống", required = true) String userId) {
        try {
            var searchResp = contactClient.searchUserByPhone(phone, userId);
            if (searchResp.getData() == null) return "Không tìm thấy số " + phone;

            var pendingResp = contactClient.getPendingRequests(userId);
            String friendshipId = pendingResp.getData().stream()
                    .filter(f -> f.getRequesterId().equals(searchResp.getData().getUserId()))
                    .map(FriendshipResponseDTO::getId).findFirst().orElse(null);

            if (friendshipId == null) return "Không thấy lời mời nào từ " + phone;
            return contactClient.acceptFriendRequest(friendshipId, userId).getData() != null ? "Đã kết bạn với " + searchResp.getData().getFullName() : "Thất bại.";
        } catch (Exception e) { return "Lỗi: " + e.getMessage(); }
    }

    @Tool(description = "Thu hồi lời mời kết bạn đã gửi.")
    public String revokeFriendRequestByPhone(@ToolParam(description = "Số điện thoại người nhận", required = true) String phone,
                                             @ToolParam(description = "Mã userId hệ thống", required = true) String userId) {
        try {
            var searchResp = contactClient.searchUserByPhone(phone, userId);
            if (searchResp.getData() == null) return "Không tìm thấy người dùng số " + phone;
            var res = contactClient.revokeFriendRequest(searchResp.getData().getUserId(), userId);
            return res.getStatus() == 200 ? "Đã thu hồi lời mời gửi cho " + searchResp.getData().getFullName() : "Lỗi: " + res.getMessage();
        } catch (Exception e) { return "Lỗi: " + e.getMessage(); }
    }

    @Tool(description = "Xóa bạn bè (Unfriend).")
    public String removeFriendByPhone(@ToolParam(description = "Số điện thoại", required = true) String phone,
                                      @ToolParam(description = "Mã userId hệ thống", required = true) String userId) {
        try {
            var searchResp = contactClient.searchUserByPhone(phone, userId);
            if (searchResp.getData() == null) return "Không tìm thấy số " + phone;
            var res = contactClient.removeFriend(searchResp.getData().getUserId(), userId);
            return res.getStatus() == 200 ? "Đã xóa bạn " + searchResp.getData().getFullName() : "Lỗi: " + res.getMessage();
        } catch (Exception e) { return "Lỗi: " + e.getMessage(); }
    }

    // Thêm hàm Từ chối nếu cần
    @Tool(description = "Từ chối lời mời kết bạn.")
    public String declineFriendRequestByPhone(String phone, String userId) {
        try {
            var searchResp = contactClient.searchUserByPhone(phone, userId);
            if (searchResp.getData() == null) return "Không tìm thấy số " + phone;
            var pending = contactClient.getPendingRequests(userId);
            String id = pending.getData().stream().filter(f -> f.getRequesterId().equals(searchResp.getData().getUserId()))
                    .map(FriendshipResponseDTO::getId).findFirst().orElse(null);
            if (id == null) return "Không có lời mời từ số này.";
            return contactClient.declineFriendRequest(id, userId).getStatus() == 200 ? "Đã từ chối lời mời." : "Lỗi.";
        } catch (Exception e) { return "Lỗi: " + e.getMessage(); }
    }
}