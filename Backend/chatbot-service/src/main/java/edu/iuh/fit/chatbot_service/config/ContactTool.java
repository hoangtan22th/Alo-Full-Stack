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

    @Tool(description = "Lấy danh sách bạn bè hiện tại. Dùng khi người dùng hỏi 'bạn bè của tôi', 'danh sách bạn', 'tôi có những bạn nào'.")
    public String getFriendsList(
            @ToolParam(description = "ID của người dùng đang đăng nhập", required = true) String userId) {
        System.out.println(">>> [TOOL CALLED] getFriendsList - userId: " + userId);
        try {
            var response = contactClient.getFriendsList(userId);
            if (response.getData() == null || response.getData().isEmpty()) {
                return "Bạn chưa có bạn bè nào.";
            }
            StringBuilder sb = new StringBuilder("👥 Danh sách bạn bè:\n");
            for (FriendshipResponseDTO f : response.getData()) {
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

    @Tool(description = "Xem danh sách các lời mời kết bạn ĐÃ GỬI đi (đang chờ người khác chấp nhận).")
    public String getSentRequests(
            @ToolParam(description = "ID của người dùng đang đăng nhập", required = true) String userId) {
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

    @Tool(description = "Tìm kiếm thông tin một người dùng thông qua số điện thoại. BẮT BUỘC phải có số điện thoại để gọi.")
    public String searchUserByPhone(
            @ToolParam(description = "Số điện thoại cần tìm (ví dụ: 0987654321)", required = true) String phone,
            @ToolParam(description = "ID của người dùng đang đăng nhập", required = true) String userId) {
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

    @Tool(description = "Gửi lời mời kết bạn MỚI bằng số điện thoại. BẮT BUỘC phải có số điện thoại. Nếu người dùng chưa cung cấp số điện thoại, KHÔNG ĐƯỢC GỌI TOOL NÀY mà hãy hỏi lại họ.")
    public String sendFriendRequestByPhone(
            @ToolParam(description = "Số điện thoại của người muốn kết bạn", required = true) String phone,
            @ToolParam(description = "ID của người dùng đang đăng nhập (người gửi)", required = true) String requesterId) {
        System.out.println(">>> [TOOL CALLED] sendFriendRequestByPhone - phone: " + phone + ", requesterId: " + requesterId);
        try {
            var searchResp = contactClient.searchUserByPhone(phone, requesterId);
            SearchFriendResponseDTO data = searchResp.getData();
            if (data == null) return "Không tìm thấy người dùng với số điện thoại " + phone;
            if (data.isFriend()) return "Người dùng " + data.getFullName() + " đã là bạn bè của bạn.";
            String recipientId = data.getUserId();
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

    @Tool(description = "Gửi lời mời kết bạn bằng ID. Chỉ dùng khi người dùng cung cấp chính xác một chuỗi ID.")
    public String sendFriendRequestById(
            @ToolParam(description = "ID của người nhận lời mời", required = true) String recipientId,
            @ToolParam(description = "ID của người dùng đang đăng nhập (người gửi)", required = true) String requesterId) {
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

    @Tool(description = "Xem danh sách các lời mời kết bạn ĐÃ NHẬN (người khác gửi cho mình, chờ mình chấp nhận).")
    public String getPendingRequests(
            @ToolParam(description = "ID của người dùng đang đăng nhập", required = true) String userId) {
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

    @Tool(description = "Đồng ý/Chấp nhận lời mời kết bạn khi người dùng cung cấp mã lời mời (friendshipId).")
    public String acceptFriendRequest(
            @ToolParam(description = "Mã của lời mời kết bạn (friendshipId)", required = true) String friendshipId,
            @ToolParam(description = "ID của người dùng đang đăng nhập (người nhận)", required = true) String userId) {
        System.out.println(">>> [TOOL CALLED] acceptFriendRequest - friendshipId: " + friendshipId + ", userId: " + userId);
        try {
            var response = contactClient.acceptFriendRequest(friendshipId, userId);
            if (response.getData() != null) {
                return "✅ Đã chấp nhận lời mời kết bạn thành công!";
            } else {
                return "Không thể chấp nhận lời mời: " + response.getMessage();
            }
        } catch (Exception e) {
            return "Lỗi khi chấp nhận lời mời: " + e.getMessage();
        }
    }

    @Tool(description = "Từ chối lời mời kết bạn khi người dùng cung cấp mã lời mời (friendshipId).")
    public String declineFriendRequest(
            @ToolParam(description = "Mã của lời mời kết bạn (friendshipId)", required = true) String friendshipId,
            @ToolParam(description = "ID của người dùng đang đăng nhập (người nhận)", required = true) String userId) {
        System.out.println(">>> [TOOL CALLED] declineFriendRequest - friendshipId: " + friendshipId + ", userId: " + userId);
        try {
            var response = contactClient.declineFriendRequest(friendshipId, userId);
            if (response.getStatus() == 200) {
                return "❌ Đã từ chối lời mời kết bạn.";
            } else {
                return "Không thể từ chối lời mời: " + response.getMessage();
            }
        } catch (Exception e) {
            return "Lỗi khi từ chối lời mời: " + e.getMessage();
        }
    }

    @Tool(description = "Thu hồi lời mời kết bạn ĐÃ GỬI đi bằng ID của người nhận.")
    public String revokeFriendRequest(
            @ToolParam(description = "ID của người nhận lời mời", required = true) String recipientId,
            @ToolParam(description = "ID của người dùng đang đăng nhập (người gửi)", required = true) String requesterId) {
        System.out.println(">>> [TOOL CALLED] revokeFriendRequest - recipientId: " + recipientId + ", requesterId: " + requesterId);
        try {
            var response = contactClient.revokeFriendRequest(recipientId, requesterId);
            if (response.getStatus() == 200) {
                return "✅ Đã thu hồi lời mời kết bạn thành công!";
            } else {
                return "Không thể thu hồi lời mời: " + response.getMessage();
            }
        } catch (Exception e) {
            return "Lỗi khi thu hồi lời mời: " + e.getMessage();
        }
    }

    @Tool(description = "Hủy kết bạn/Xóa một người bạn bằng ID của họ.")
    public String removeFriend(
            @ToolParam(description = "ID của người bạn cần xóa", required = true) String friendId,
            @ToolParam(description = "ID của người dùng đang đăng nhập", required = true) String userId) {
        System.out.println(">>> [TOOL CALLED] removeFriend - friendId: " + friendId + ", userId: " + userId);
        try {
            var response = contactClient.removeFriend(friendId, userId);
            if (response.getStatus() == 200) {
                return "👋 Đã xóa bạn bè thành công.";
            } else {
                return "Không thể xóa bạn bè: " + response.getMessage();
            }
        } catch (Exception e) {
            return "Lỗi khi xóa bạn bè: " + e.getMessage();
        }
    }

    @Tool(description = "Đồng ý/Chấp nhận lời mời kết bạn từ một người khác thông qua SỐ ĐIỆN THOẠI của họ. BẮT BUỘC cần số điện thoại.")
    public String acceptFriendRequestByPhone(
            @ToolParam(description = "Số điện thoại của người đã gửi lời mời", required = true) String phone,
            @ToolParam(description = "ID của người dùng đang đăng nhập (người nhận)", required = true) String userId) {
        System.out.println(">>> [TOOL CALLED] acceptFriendRequestByPhone - phone: " + phone + ", userId: " + userId);
        try {
            var searchResp = contactClient.searchUserByPhone(phone, userId);
            SearchFriendResponseDTO data = searchResp.getData();
            if (data == null) return "Không tìm thấy người dùng với số điện thoại " + phone;
            String requesterId = data.getUserId();
            var pendingResp = contactClient.getPendingRequests(userId);
            if (pendingResp.getData() == null || pendingResp.getData().isEmpty())
                return "Bạn không có lời mời kết bạn nào từ số " + phone;
            String friendshipId = null;
            for (FriendshipResponseDTO f : pendingResp.getData()) {
                if (f.getRequesterId().equals(requesterId)) {
                    friendshipId = f.getId();
                    break;
                }
            }
            if (friendshipId == null) return "Không tìm thấy lời mời từ " + phone;
            var acceptResp = contactClient.acceptFriendRequest(friendshipId, userId);
            if (acceptResp.getData() != null) return "✅ Đã chấp nhận lời mời kết bạn từ " + data.getFullName() + " (" + phone + ")";
            else return "Không thể chấp nhận: " + acceptResp.getMessage();
        } catch (Exception e) {
            return "Lỗi: " + e.getMessage();
        }
    }

    @Tool(description = "Từ chối lời mời kết bạn từ một người khác thông qua SỐ ĐIỆN THOẠI của họ. BẮT BUỘC cần số điện thoại.")
    public String declineFriendRequestByPhone(
            @ToolParam(description = "Số điện thoại của người đã gửi lời mời", required = true) String phone,
            @ToolParam(description = "ID của người dùng đang đăng nhập", required = true) String userId) {
        System.out.println(">>> [TOOL CALLED] declineFriendRequestByPhone - phone: " + phone + ", userId: " + userId);
        try {
            var searchResp = contactClient.searchUserByPhone(phone, userId);
            SearchFriendResponseDTO data = searchResp.getData();
            if (data == null) return "Không tìm thấy người dùng với số điện thoại " + phone;
            String requesterId = data.getUserId();
            var pendingResp = contactClient.getPendingRequests(userId);
            if (pendingResp.getData() == null) return "Không có lời mời từ " + phone;
            String friendshipId = null;
            for (FriendshipResponseDTO f : pendingResp.getData()) {
                if (f.getRequesterId().equals(requesterId)) {
                    friendshipId = f.getId();
                    break;
                }
            }
            if (friendshipId == null) return "Không tìm thấy lời mời từ " + phone;
            var declineResp = contactClient.declineFriendRequest(friendshipId, userId);
            if (declineResp.getStatus() == 200) return "❌ Đã từ chối lời mời kết bạn từ " + data.getFullName();
            else return "Không thể từ chối: " + declineResp.getMessage();
        } catch (Exception e) {
            return "Lỗi: " + e.getMessage();
        }
    }

    @Tool(description = "Thu hồi lời mời kết bạn mình ĐÃ GỬI thông qua SỐ ĐIỆN THOẠI của người nhận. BẮT BUỘC cần số điện thoại.")
    public String revokeFriendRequestByPhone(
            @ToolParam(description = "Số điện thoại của người đã nhận lời mời", required = true) String phone,
            @ToolParam(description = "ID của người dùng đang đăng nhập (người gửi)", required = true) String requesterId) {
        System.out.println(">>> [TOOL CALLED] revokeFriendRequestByPhone - phone: " + phone + ", requesterId: " + requesterId);
        try {
            var searchResp = contactClient.searchUserByPhone(phone, requesterId);
            SearchFriendResponseDTO data = searchResp.getData();
            if (data == null) return "Không tìm thấy người dùng với số điện thoại " + phone;
            String recipientId = data.getUserId();
            var revokeResp = contactClient.revokeFriendRequest(recipientId, requesterId);
            if (revokeResp.getStatus() == 200) return "✅ Đã thu hồi lời mời kết bạn đến " + data.getFullName();
            else return "Không thể thu hồi: " + revokeResp.getMessage();
        } catch (Exception e) {
            return "Lỗi: " + e.getMessage();
        }
    }

    @Tool(description = "Hủy kết bạn/Xóa một người khỏi danh sách bạn bè bằng SỐ ĐIỆN THOẠI của họ. BẮT BUỘC cần số điện thoại.")
    public String removeFriendByPhone(
            @ToolParam(description = "Số điện thoại của bạn bè cần xóa", required = true) String phone,
            @ToolParam(description = "ID của người dùng đang đăng nhập", required = true) String userId) {
        System.out.println(">>> [TOOL CALLED] removeFriendByPhone - phone: " + phone + ", userId: " + userId);
        try {
            var searchResp = contactClient.searchUserByPhone(phone, userId);
            SearchFriendResponseDTO data = searchResp.getData();
            if (data == null) return "Không tìm thấy người dùng với số điện thoại " + phone;
            if (!data.isFriend()) return "Người này hiện không phải là bạn bè của bạn.";
            String friendId = data.getUserId();
            var removeResp = contactClient.removeFriend(friendId, userId);
            if (removeResp.getStatus() == 200) return "👋 Đã xóa bạn bè " + data.getFullName() + " thành công.";
            else return "Không thể xóa: " + removeResp.getMessage();
        } catch (Exception e) {
            return "Lỗi: " + e.getMessage();
        }
    }

    @Tool(description = "Xóa toàn bộ lịch sử trò chuyện của AI trong phiên hiện tại.")
    public String clearMyMemory(
            @ToolParam(description = "ID của người dùng đang đăng nhập", required = true) String userId) {
        return "Đã nhận yêu cầu xóa lịch sử.";
    }
}