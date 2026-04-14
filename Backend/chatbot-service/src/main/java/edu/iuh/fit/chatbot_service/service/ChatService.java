package edu.iuh.fit.chatbot_service.service;

import edu.iuh.fit.chatbot_service.config.*;
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
    private final ChatHistoryRepository chatHistoryRepository;

    public ChatService(ChatClient.Builder builder, WeatherToolConfig weatherTool, UserTool userTool, ContactTool contactTool, SystemTool systemTool, ChatHistoryRepository chatHistoryRepository) {
        this.weatherTool = weatherTool; this.userTool = userTool; this.contactTool = contactTool; this.systemTool = systemTool; this.chatHistoryRepository = chatHistoryRepository;
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

            // [FIXED] System prompt: Đưa ra luật rõ ràng để AI không tự bịa thông số
            String systemPromptText = String.format("""
                    Bạn là AI của Alo Chat. ID hiện tại của bạn là: %s. (LUÔN DÙNG ID NÀY CHO THAM SỐ userId HOẶC requesterId TRONG TOOL).
                    
                    NGUYÊN TẮC HOẠT ĐỘNG (TUYỆT ĐỐI TUÂN THỦ):
                    1. HỎI LẠI NẾU THIẾU: Không bao giờ gọi tool nếu người dùng chưa cung cấp đủ thông tin bắt buộc (ví dụ: số điện thoại, tên thành phố).
                    2. KHÔNG TỰ BỊA: Không tự bịa ra số điện thoại, ID, hoặc tên thành phố để điền vào Tool.
                    3. GIAO TIẾP TỰ NHIÊN: Nếu người dùng chỉ chào hỏi, tán gẫu, hãy trả lời bình thường, KHÔNG GỌI TOOL.
                    """, userId);

            List<Message> messages = new ArrayList<>();
            messages.add(new SystemMessage(systemPromptText));
            messages.addAll(history);
            messages.add(new UserMessage(request.message()));

            String content = chatClient.prompt()
                    .messages(messages)
                    .tools(weatherTool, userTool, contactTool, systemTool)
                    .call()
                    .content();

            // Lưu lịch sử...
            ChatHistory userMsg = new ChatHistory();
            userMsg.setConversationId(conversationId); userMsg.setRole("user"); userMsg.setContent(request.message());
            chatHistoryRepository.save(userMsg);

            if (content != null && !content.isBlank()) {
                ChatHistory assistantMsg = new ChatHistory();
                assistantMsg.setConversationId(conversationId); assistantMsg.setRole("assistant"); assistantMsg.setContent(content);
                chatHistoryRepository.save(assistantMsg);
            }

            // Xóa cũ...
            List<ChatHistory> all = chatHistoryRepository.findByConversationIdOrderByCreatedAtAsc(conversationId);
            if (all.size() > 20) {
                for (int i = 0; i < all.size() - 20; i++) chatHistoryRepository.delete(all.get(i));
            }

            System.out.println(">>> [AI RESPONSE] " + content);
            return content != null ? content.strip().replaceAll("^\"|\"$", "") : "";
        } catch (Exception e) {
            e.printStackTrace();
            return "Xin lỗi, đã có lỗi: " + e.getMessage();
        }
    }
}