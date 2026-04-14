package edu.iuh.fit.chatbot_service.service;

import edu.iuh.fit.chatbot_service.config.*;
import edu.iuh.fit.chatbot_service.dto.ChatRequest;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;

@Service
public class ChatService {

    private final ChatClient chatClient;
    private final WeatherToolConfig weatherTool;
    private final UserTool userTool;
    private final ContactTool contactTool;
    private final SystemTool systemTool;

    public ChatService(ChatClient.Builder builder,
                       WeatherToolConfig weatherTool,
                       UserTool userTool,
                       ContactTool contactTool,
                       SystemTool systemTool) {
        this.weatherTool = weatherTool;
        this.userTool = userTool;
        this.contactTool = contactTool;
        this.systemTool = systemTool;
        this.chatClient = builder
                .defaultSystem("Bạn là trợ lý AI thông minh của Alo Chat.")
                .build();
    }

    public String chat(ChatRequest request) {
        try {
            String dynamicSystem = """
                Bạn là trợ lý AI của Alo Chat.
                Người dùng hiện tại có ID: %s
                Hướng dẫn:
                - Hỏi thời tiết → gọi getWeather
                - Tìm người dùng theo tên/email/số điện thoại → gọi searchUsers (các tham số có thể bỏ trống)
                - Xem danh sách bạn bè → gọi getFriendsList với userId = %s
                - Tìm người theo số điện thoại → gọi searchUserByPhone
                - Gửi lời mời kết bạn → gọi sendFriendRequest với recipientId và requesterId = %s
                - Hỏi giờ → gọi getCurrentTime
                - Hỏi phiên bản → gọi getAppVersion
                Trả lời bằng tiếng Việt, thân thiện.
                """.formatted(request.userId(), request.userId(), request.userId());

            String content = chatClient.prompt()
                    .system(dynamicSystem)
                    .user(request.message())
                    .tools(weatherTool, userTool, contactTool, systemTool)
                    .call()
                    .content();

            return content != null ? content.strip().replaceAll("^\"|\"$", "") : "";
        } catch (Exception e) {
            e.printStackTrace();
            return "Xin lỗi, đã có lỗi: " + e.getMessage();
        }
    }
}