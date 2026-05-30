package edu.iuh.fit.chatbot_service.service;

import edu.iuh.fit.chatbot_service.config.*;
import edu.iuh.fit.chatbot_service.dto.ChatRequest;
import edu.iuh.fit.chatbot_service.entity.ChatHistory;
import edu.iuh.fit.chatbot_service.repository.ChatHistoryRepository;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.*;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class ChatService {

    private final ChatClient chatClient;
    private final WeatherToolConfig weatherTool;
    private final UserTool userTool;
    private final ContactTool contactTool;
    private final MessageTool messageTool;
    private final ChatHistoryRepository chatHistoryRepository;
    private final VectorStore vectorStore;
    private final GuidelineTool guidelineTool;
    private final SystemTool systemTool; // 🚀 Inject SystemTool

    private static final String AI_GUARDRAIL_PROMPT = """
            BẢN HIẾN PHÁP TRỢ LÝ ALO CHAT:
            1. Bạn là trợ lý AI thông minh tích hợp TRONG ỨNG DỤNG ALO CHAT.
            2. PHẠM VI TRẢ LỜI: Chỉ trả lời về các tính năng của Alo Chat (kết bạn, chat, thời tiết, hướng dẫn sử dụng).
            3. QUY TẮC TỪ CHỐI: Tuyệt đối từ chối trả lời về: Chính trị, tôn giáo, nấu ăn, lập trình (ngoài hệ thống), nội dung người lớn, hoặc bất kỳ vấn đề nào không liên quan đến Alo Chat.
            4. CÁCH TỪ CHỐI: Nếu câu hỏi ngoài phạm vi, hãy trả lời: "Xin lỗi, mình là trợ lý chuyên biệt của Alo Chat, mình không thể trả lời vấn đề này. Bạn có cần hỗ trợ gì về các tính năng của app không?"
            5. XƯNG HÔ: Gọi người dùng bằng tên của họ (được cung cấp là {username}) và xưng là "mình" hoặc "Alo Bot". Luôn tỏ ra thân thiện và hỗ trợ.
            """;

    public ChatService(ChatClient.Builder builder,
            WeatherToolConfig weatherTool,
            UserTool userTool,
            ContactTool contactTool,
            MessageTool messageTool,
            ChatHistoryRepository chatHistoryRepository,
            VectorStore vectorStore,
            GuidelineTool guidelineTool,
            SystemTool systemTool) { // 🚀 Inject SystemTool bean
        this.weatherTool = weatherTool;
        this.userTool = userTool;
        this.contactTool = contactTool;
        this.messageTool = messageTool;
        this.chatHistoryRepository = chatHistoryRepository;
        this.vectorStore = vectorStore;
        this.guidelineTool = guidelineTool;
        this.systemTool = systemTool;
        this.chatClient = builder.build();
    }

    @Transactional(readOnly = true)
    public List<ChatHistory> getHistory(String userId) {
        List<ChatHistory> history = chatHistoryRepository.findByConversationIdOrderByCreatedAtAsc(userId);
        return history.stream()
                .skip(Math.max(0, history.size() - 20))
                .collect(Collectors.toList());
    }

    @Transactional
    public String chat(ChatRequest request) {
        try {
            String userId = request.userId();
            String roomId = (request.roomId() != null) ? request.roomId() : "GLOBAL";
            String lowerMsg = request.message().toLowerCase();

            String currentUserName = getUserName(userId);

            // 1. Nhận diện yêu cầu Tóm tắt - Giữ nguyên logic chuyên biệt
            if (lowerMsg.contains("tóm tắt") || lowerMsg.contains("summary")) {
                if ("GLOBAL".equals(roomId)) {
                    return currentUserName + " ơi, mình chỉ tóm tắt được trong phòng chat riêng thôi nha!";
                }

                String transcript = (request.context() != null && !request.context().isBlank())
                        ? request.context()
                        : messageTool.getMessageHistory(roomId, userId);

                String summary = summarizeConversation(transcript, currentUserName);

                System.out.println(">>> [CHATBOT] Đã thực hiện tóm tắt (Không lưu vào database theo yêu cầu).");
                return summary.strip();
            }

            // 2. 🚀 LUỒNG AI AGENT ĐÍCH THỰC (Spring AI Function Calling)
            // Tích hợp thông tin cá nhân và hướng dẫn sử dụng Tool
            String personalizedPrompt = AI_GUARDRAIL_PROMPT.replace("{username}", currentUserName)
                    + "\nID người dùng hiện tại của bạn trong hệ thống là: " + userId 
                    + ". Khi gọi bất kỳ công cụ (tool) nào yêu cầu tham số userId, BẮT BUỘC hãy truyền giá trị ID này.";

            List<Message> messages = new ArrayList<>();
            messages.add(new SystemMessage(personalizedPrompt));

            // Load 10 tin nhắn gần nhất để duy trì ngữ cảnh chat
            List<ChatHistory> history = chatHistoryRepository.findByConversationIdOrderByCreatedAtAsc(userId);
            history.stream().skip(Math.max(0, history.size() - 10)).forEach(h -> {
                if ("user".equals(h.getRole()))
                    messages.add(new UserMessage(h.getContent()));
                else
                    messages.add(new AssistantMessage(h.getContent()));
            });
            messages.add(new UserMessage(request.message()));

            // Gọi mô hình với cơ chế Tool Calling tự động
            String content = chatClient.prompt()
                    .messages(messages)
                    .tools(contactTool, weatherTool, userTool, messageTool, guidelineTool, systemTool)
                    .call()
                    .content();

            // Lưu cuộc hội thoại vào lịch sử
            saveHistory(userId, request.message(), content);
            return content;

        } catch (Exception e) {
            e.printStackTrace();
            return "Lỗi hệ thống: " + e.getMessage();
        }
    }

    private String getUserName(String userId) {
        try {
            String name = userTool.getUserInfo(userId);
            return (name != null && !name.isBlank()) ? name : "bạn";
        } catch (Exception e) {
            return "bạn";
        }
    }

    private String summarizeConversation(String transcript, String currentUserName) {
        if (transcript == null || transcript.isBlank() || transcript.contains("chưa có tin nhắn")) {
            return "Không có dữ liệu tin nhắn để tóm tắt.";
        }

        String systemPrompt = String.format(
                """
                        Bạn là trợ lý AI thông minh của Alo Chat, có khả năng tóm tắt hội thoại xuất sắc như tính năng của Messenger/Meta AI.

                        NHIỆM VỤ:
                        Phân tích dữ liệu tin nhắn dưới đây và cung cấp một bản tóm tắt ngắn gọn, mạch lạc và giàu ngữ cảnh.

                        [HƯỚNG DẪN CHI TIẾT]:
                        1. NGỮ CẢNH: Nếu là nhóm, hãy nêu rõ các thành viên chính đang thảo luận về nội dung gì.
                        2. TÊN NGƯỜI: Tuyệt đối sử dụng tên thật của các thành viên xuất hiện trong dữ liệu (ví dụ: "Tùng", "Hoa", "Admin"). Xưng hô "%s" là người đang yêu cầu tóm tắt (hãy gọi là "Bạn").
                        3. CẤU TRÚC BẢN TÓM TẮT:
                           - Bắt đầu bằng tiêu đề: "### 📝 Tóm tắt nội dung hội thoại"
                           - Phân 1: Một đoạn văn ngắn (2-3 câu) kể lại câu chuyện đang diễn ra (ví dụ: "Trong nhóm này, mọi người đang bàn về việc đi chơi cuối tuần...").
                           - Phần 2: Các diễn biến chính, sử dụng dấu gạch đầu dòng (-). Mỗi dòng nên bắt đầu bằng tên người và hành động của họ (ví dụ: "- **Tùng** đề xuất đi Vũng Tàu nhưng **Hoa** lo ngại về thời tiết.").
                           - Phần 3: Kết luận hoặc các việc cần làm (nếu có).
                        4. ĐỊNH DẠNG: BẮT BUỘC sử dụng dấu gạch đầu dòng (-) cho các ý chi tiết để hệ thống hiển thị icon đẹp. Sử dụng **In đậm** cho tên người và các từ khóa quan trọng.
                        5. PHONG CÁCH: Thân thiện, chuyên nghiệp, súc tích.

                        DỮ LIỆU TIN NHẮN:
                        %s
                        """,
                currentUserName, transcript);

        List<Message> messages = new ArrayList<>();
        messages.add(new SystemMessage(systemPrompt));
        messages.add(new UserMessage("Tóm tắt giúp mình nội dung đoạn chat trên."));

        try {
            String content = chatClient.prompt().messages(messages).call().content();
            if (content == null || content.isBlank())
                return "AI không tìm thấy thông tin quan trọng để tóm tắt.";

            if (!content.contains("###")) {
                content = "### Nội dung tóm tắt\n" + content;
            }
            return content.strip();
        } catch (Exception e) {
            return "Lỗi tóm tắt: " + e.getMessage();
        }
    }

    private void saveHistory(String userId, String userMsg, String aiMsg) {
        ChatHistory u = new ChatHistory();
        u.setConversationId(userId);
        u.setRole("user");
        u.setContent(userMsg);
        chatHistoryRepository.save(u);
        if (aiMsg != null && !aiMsg.isBlank()) {
            ChatHistory a = new ChatHistory();
            a.setConversationId(userId);
            a.setRole("assistant");
            a.setContent(aiMsg);
            chatHistoryRepository.save(a);
        }
    }
}