package edu.iuh.fit.chatbot_service.config;

import edu.iuh.fit.chatbot_service.client.MessageClient;
import edu.iuh.fit.chatbot_service.dto.MessageDTO;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

import java.text.SimpleDateFormat;

@Component
public class MessageTool {

    private final MessageClient messageClient;

    public MessageTool(MessageClient messageClient) {
        this.messageClient = messageClient;
    }

    @Tool(description = "Lấy lịch sử 50 tin nhắn gần nhất của một cuộc trò chuyện để AI đọc hiểu, tìm kiếm hoặc tóm tắt nội dung.")
    public String getMessageHistory(
            @ToolParam(description = "Mã ID của cuộc trò chuyện (conversationId)", required = true) String conversationId,
            @ToolParam(description = "ID của người dùng đang đăng nhập", required = true) String userId) {

        System.out.println(">>> [TOOL CALLED] getMessageHistory cho Conversation: " + conversationId);

        try {
            // Gọi qua Node.js lấy 50 tin nhắn
            var response = messageClient.getHistory(conversationId, 50, userId);

            if (response == null || response.getMessages() == null || response.getMessages().isEmpty()) {
                return "Cuộc trò chuyện này hiện tại chưa có tin nhắn nào.";
            }

            // Dịch đống JSON thành kịch bản văn bản (Transcript) cho AI đọc
            StringBuilder transcript = new StringBuilder("Dữ liệu tin nhắn gần nhất (đã sắp xếp theo thời gian):\n\n");
            SimpleDateFormat sdf = new SimpleDateFormat("HH:mm dd/MM");

            for (MessageDTO msg : response.getMessages()) {
                // Phân biệt Ai là người gửi (Tui hay đối phương)
                String sender = msg.getSenderId().equals(userId) ? "TÔI" : "NGƯỜI KIA";
                String time = sdf.format(msg.getCreatedAt());

                // Xử lý loại tin nhắn
                String contentToRead = msg.getContent();
                if (msg.isRevoked()) {
                    contentToRead = "[Tin nhắn đã bị thu hồi]";
                } else if ("image".equals(msg.getType())) {
                    contentToRead = "[Đã gửi một hình ảnh]";
                } else if ("file".equals(msg.getType())) {
                    contentToRead = "[Đã gửi một tệp đính kèm]";
                }

                transcript.append(String.format("[%s] %s: %s\n", time, sender, contentToRead));
            }

            return transcript.toString();

        } catch (Exception e) {
            return "Lỗi khi lấy lịch sử tin nhắn: Hệ thống nhắn tin đang tạm gián đoạn.";
        }
    }
}