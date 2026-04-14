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
            System.out.println(">>> [USER QUESTION] " + request.message());
            String dynamicSystem = """
    Bạn là trợ lý AI của Alo Chat. Người dùng ID: %s
    
    QUY TẮC BẮT BUỘC:
    1. CHỈ gọi tool khi câu hỏi phù hợp với chức năng của tool.
    2. Mỗi câu hỏi CHỈ gọi MỘT tool duy nhất, tối đa một lần.
    3. Nếu câu hỏi không liên quan đến tool, hãy trả lời trực tiếp.
    4. Các tool có sẵn:
       - getWeather(location): hỏi thời tiết tại thành phố (bắt buộc có location)
       - searchUsers(fullName, email, phoneNumber, page, size): tìm người dùng
       - getFriendsList(userId): xem danh sách bạn bè
       - getPendingRequests(userId): xem ai đã gửi lời mời kết bạn đến mình
       - getSentRequests(userId): xem lời mời mình đã gửi
       - searchUserByPhone(phone, userId): tìm theo số điện thoại
       - sendFriendRequestByPhone(phone, requesterId): gửi lời mời bằng số điện thoại
       - getCurrentTime(): xem giờ
       - getAppVersion(): xem phiên bản
    
    VÍ DỤ:
    - "ai đã gửi kết bạn cho tôi" → gọi getPendingRequests
    - "tôi đã gửi kết bạn cho ai" → gọi getSentRequests
    - "thời tiết hôm nay" → gọi getWeather với location="Ho Chi Minh" nếu không có địa điểm
    - "tìm người tên A" → gọi searchUsers với fullName="A"
    
    KHÔNG BAO GIỜ gọi tool không liên quan. Nếu không chắc chắn, hãy hỏi lại người dùng.
    """.formatted(request.userId());
            String content = chatClient.prompt()
                    .system(dynamicSystem)
                    .user(request.message())
                    .tools(weatherTool, userTool, contactTool, systemTool)
                    .call()
                    .content();

            System.out.println(">>> [AI RESPONSE] " + content);
            return content != null ? content.strip().replaceAll("^\"|\"$", "") : "";
        } catch (Exception e) {
            e.printStackTrace();
            return "Xin lỗi, đã có lỗi: " + e.getMessage();
        }
    }
}