package edu.iuh.fit.chatbot_service.config;

import edu.iuh.fit.chatbot_service.client.UserClient;
import edu.iuh.fit.chatbot_service.dto.UserDto;
import edu.iuh.fit.common_service.dto.response.PageResponse;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

@Component
public class UserTool {
    private final UserClient userClient;
    public UserTool(UserClient userClient) { this.userClient = userClient; }

    @Tool(description = "Tìm kiếm người dùng theo tên, email hoặc số điện thoại. Các tham số có thể bỏ trống.")
    public String searchUsers(
            @ToolParam(description = "Họ tên (có thể null)", required = false) String fullName,
            @ToolParam(description = "Email (có thể null)", required = false) String email,
            @ToolParam(description = "Số điện thoại (có thể null)", required = false) String phoneNumber,
            @ToolParam(description = "Số trang, bắt đầu từ 0", required = false) Integer page,
            @ToolParam(description = "Kích thước trang", required = false) Integer size) {
        System.out.println(">>> [TOOL CALLED] searchUsers - fullName: " + fullName + ", email: " + email + ", phoneNumber: " + phoneNumber);
        int pageNum = (page != null && page >= 0) ? page : 0;
        int pageSize = (size != null && size > 0) ? size : 10;
        try {
            PageResponse<UserDto> pageResp = userClient.searchUsers(fullName, email, phoneNumber, pageNum, pageSize);
            if (pageResp.getContent().isEmpty()) return "Không tìm thấy người dùng nào phù hợp.";
            StringBuilder sb = new StringBuilder("🔍 Kết quả tìm kiếm (trang " + pageNum + ", tổng " + pageResp.getTotalElements() + "):\n");
            for (UserDto u : pageResp.getContent()) {
                sb.append("- ").append(u.getFullName()).append(" (").append(u.getEmail()).append(")\n");
            }
            return sb.toString();
        } catch (Exception e) {
            return "Lỗi khi tìm kiếm người dùng: " + e.getMessage();
        }
    }
    @Tool(description = "Lấy tên đầy đủ của người dùng hiện tại.")
    public String getUserInfo(@ToolParam(description = "Mã ID người dùng", required = true) String userId) {
        try {
            // Theo cú pháp hàm searchUsers ở trên, response trả về thẳng UserDto
            UserDto user = userClient.getUserById(userId);

            if (user != null) {
                return (user.getFullName() != null && !user.getFullName().isBlank())
                        ? user.getFullName() : "Người dùng";
            }
            return "Người dùng";
        } catch (Exception e) {
            System.err.println(">>> [LỖI USER TOOL]: " + e.getMessage());
            return "Người dùng";
        }
    }
}