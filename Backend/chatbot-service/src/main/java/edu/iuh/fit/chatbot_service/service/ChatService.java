package edu.iuh.fit.chatbot_service.service;

import edu.iuh.fit.chatbot_service.config.*;
import edu.iuh.fit.chatbot_service.config.GuidelineTool;
import edu.iuh.fit.chatbot_service.dto.ChatRequest;
import edu.iuh.fit.chatbot_service.entity.ChatHistory;
import edu.iuh.fit.chatbot_service.repository.ChatHistoryRepository;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class ChatService {

    private final ChatClient chatClient;
    private final WeatherToolConfig weatherTool;
    private final UserTool userTool;
    private final ContactTool contactTool;
    private final SystemTool systemTool;
    private final GuidelineTool guidelineTool;
    private final ChatHistoryRepository chatHistoryRepository;

    public ChatService(ChatClient.Builder builder,
                       WeatherToolConfig weatherTool,
                       UserTool userTool,
                       ContactTool contactTool,
                       SystemTool systemTool,
                       GuidelineTool guidelineTool,
                       ChatHistoryRepository chatHistoryRepository) {
        this.weatherTool = weatherTool;
        this.userTool = userTool;
        this.contactTool = contactTool;
        this.systemTool = systemTool;
        this.guidelineTool = guidelineTool;
        this.chatHistoryRepository = chatHistoryRepository;
        this.chatClient = builder.build();
    }

    @Transactional
    public String chat(ChatRequest request) {
        try {
            System.out.println(">>> [USER QUESTION] " + request.message());
            String userId = request.userId();
            String conversationId = userId;

            List<ChatHistory> historyEntities = chatHistoryRepository.findByConversationIdOrderByCreatedAtAsc(conversationId);
            List<Message> history = new ArrayList<>();
            for (ChatHistory h : historyEntities) {
                if ("user".equals(h.getRole())) history.add(new UserMessage(h.getContent()));
                else if ("assistant".equals(h.getRole())) history.add(new AssistantMessage(h.getContent()));
            }

            // System prompt ngắn gọn, hướng dẫn AI khi nào gọi guideline
            String systemPromptText = String.format("""
                    Bạn là AI Alo Chat. ID người dùng: %s.
                    
                    QUY TẮC:
                    1. Nếu người dùng hỏi về CÁCH SỬ DỤNG APP (ví dụ: "nút kết bạn ở đâu?", "làm sao tạo nhóm?", "hướng dẫn xóa bạn") → hãy gọi tool readGuidelines().
                    2. Còn lại, xử lý bình thường với các tool: thời tiết, tìm người, kết bạn, xóa bạn, xem danh sách, v.v.
                    3. KHÔNG tự bịa số điện thoại hay ID. Hỏi lại nếu thiếu thông tin.
                    4. Trả lời ngắn gọn, tiếng Việt.
                    """, userId);

            List<Message> messages = new ArrayList<>();
            messages.add(new SystemMessage(systemPromptText));
            messages.addAll(history);
            messages.add(new UserMessage(request.message()));

            String content = chatClient.prompt()
                    .messages(messages)
                    .tools(weatherTool, userTool, contactTool, systemTool, guidelineTool)
                    .call()
                    .content();

            // Lưu lịch sử
            ChatHistory userMsg = new ChatHistory();
            userMsg.setConversationId(conversationId);
            userMsg.setRole("user");
            userMsg.setContent(request.message());
            chatHistoryRepository.save(userMsg);

            if (content != null && !content.isBlank()) {
                ChatHistory assistantMsg = new ChatHistory();
                assistantMsg.setConversationId(conversationId);
                assistantMsg.setRole("assistant");
                assistantMsg.setContent(content);
                chatHistoryRepository.save(assistantMsg);
            }

            // Giới hạn lịch sử 10 tin nhắn để tiết kiệm token
            List<ChatHistory> all = chatHistoryRepository.findByConversationIdOrderByCreatedAtAsc(conversationId);
            if (all.size() > 10) {
                for (int i = 0; i < all.size() - 10; i++) chatHistoryRepository.delete(all.get(i));
            }

            System.out.println(">>> [AI RESPONSE] " + content);
            return content != null ? content.strip().replaceAll("^\"|\"$", "") : "";
        } catch (Exception e) {
            e.printStackTrace();
            return "Xin lỗi, đã có lỗi: " + e.getMessage();
        }
    }
}