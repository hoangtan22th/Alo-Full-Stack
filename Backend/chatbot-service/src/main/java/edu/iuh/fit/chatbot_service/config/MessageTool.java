package edu.iuh.fit.chatbot_service.config;

import edu.iuh.fit.chatbot_service.client.MessageClient;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;
import java.util.List;
import java.util.Map;

@Component
public class MessageTool {

    private final MessageClient messageClient;

    public MessageTool(MessageClient messageClient) {
        this.messageClient = messageClient;
    }

    @Tool(description = "Tìm kiếm tin nhắn cũ của người dùng hiện tại theo từ khóa.")
    public String searchMessages(@ToolParam(description = "ID người dùng hiện tại") String userId,
                                 @ToolParam(description = "Từ khóa cần tìm") String keyword) {
        if (keyword == null || keyword.isBlank()) return "Vui lòng nhập từ khóa.";
        if (userId == null || userId.isBlank()) return "Không xác định được người dùng.";
        try {
            List<Map<String, Object>> messages = messageClient.searchMessages(userId, keyword);
            if (messages == null || messages.isEmpty())
                return "Không tìm thấy tin nhắn nào chứa: " + keyword;
            StringBuilder sb = new StringBuilder("📩 Tin nhắn tìm thấy:\n");
            for (Map<String, Object> m : messages) {
                sb.append(String.format("[%s] %s: %s\n",
                        m.get("sentAt"), m.get("senderName"), m.get("content")));
                if (sb.length() > 1000) break;
            }
            return sb.toString();
        } catch (Exception e) {
            return "Lỗi gọi API tìm tin nhắn: " + e.getMessage();
        }
    }
}