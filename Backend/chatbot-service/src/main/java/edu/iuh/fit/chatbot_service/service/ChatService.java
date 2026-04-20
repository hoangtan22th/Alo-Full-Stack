//package edu.iuh.fit.chatbot_service.service;
//
//import edu.iuh.fit.chatbot_service.config.*;
//import edu.iuh.fit.chatbot_service.dto.ChatRequest;
//import edu.iuh.fit.chatbot_service.entity.ChatHistory;
//import edu.iuh.fit.chatbot_service.repository.ChatHistoryRepository;
//import org.springframework.ai.chat.client.ChatClient;
//import org.springframework.ai.chat.messages.*;
//import org.springframework.ai.document.Document;
//import org.springframework.ai.vectorstore.SearchRequest;
//import org.springframework.ai.vectorstore.VectorStore;
//import org.springframework.stereotype.Service;
//import org.springframework.transaction.annotation.Transactional;
//
//import java.util.*;
//import java.util.regex.Matcher;
//import java.util.regex.Pattern;
//import java.util.stream.Collectors;
//
//@Service
//public class ChatService {
//
//    private final ChatClient chatClient;
//    private final WeatherToolConfig weatherTool;
//    private final UserTool userTool;
//    private final ContactTool contactTool;
//    private final SystemTool systemTool;
//    private final MessageTool messageTool;
//    private final ChatHistoryRepository chatHistoryRepository;
//    private final VectorStore vectorStore;
//    private final GuidelineTool guidelineTool;
//
//    public ChatService(ChatClient.Builder builder,
//                       WeatherToolConfig weatherTool,
//                       UserTool userTool,
//                       ContactTool contactTool,
//                       SystemTool systemTool,
//                       MessageTool messageTool,
//                       ChatHistoryRepository chatHistoryRepository,
//                       VectorStore vectorStore, GuidelineTool guidelineTool) {
//        this.weatherTool = weatherTool;
//        this.userTool = userTool;
//        this.contactTool = contactTool;
//        this.systemTool = systemTool;
//        this.messageTool = messageTool;
//        this.chatHistoryRepository = chatHistoryRepository;
//        this.vectorStore = vectorStore;
//        this.chatClient = builder.build();
//        this.guidelineTool = guidelineTool;
//    }
//
//    @Transactional
//    public String chat(ChatRequest request) {
//        try {
//            String userId = request.userId();
//            String roomId = (request.roomId() != null) ? request.roomId() : "GLOBAL";
//            String lowerMsg = request.message().toLowerCase();
//            String toolResult = null;
//            String phone = extractPhone(request.message()); // Tách SĐT ra 1 lần xài chung
//
//            System.out.println(">>> [USER CHAT]: " + lowerMsg);
//            System.out.println(">>> [EXTRACTED PHONE]: " + phone);
//            String content = "";
//            // --- BỘ ROUTER CHỐNG ĐẠN ---
//            // 1. Bắt câu hỏi về Hướng dẫn sử dụng
//            if (lowerMsg.contains("hướng dẫn") || lowerMsg.contains("cách sử dụng")
//                    || lowerMsg.contains("cách dùng") || lowerMsg.contains("cách xài")
//                    || lowerMsg.contains("làm sao để")) {
//                toolResult = guidelineTool.readGuidelines();
//            }
//            // 1. Xem danh sách bạn bè
//            else if (lowerMsg.contains("bạn bè") || lowerMsg.contains("danh sách bạn")) {
//                toolResult = contactTool.getFriendsList(userId);
//            }
//            // 2. Ai gửi cho tôi (Pending)
//            else if ((lowerMsg.contains("lời mời") || lowerMsg.contains("gửi kết bạn") || lowerMsg.contains("ai kết bạn"))
//                    && (lowerMsg.contains("cho tôi") || lowerMsg.contains("đến tôi") || lowerMsg.contains("với tôi") || lowerMsg.contains("ai đã"))) {
//                toolResult = contactTool.getPendingRequests(userId);
//            }
//            // 3. Tôi gửi cho ai (Sent)
//            else if ((lowerMsg.contains("lời mời") || lowerMsg.contains("gửi kết bạn") || lowerMsg.contains("đã gửi"))
//                    && (lowerMsg.contains("cho ai") || lowerMsg.contains("những ai"))) {
//                toolResult = contactTool.getSentRequests(userId);
//            }
//            // 4. Xóa bạn / Hủy bạn (Bao gồm các kiểu gõ dấu)
//            else if ((lowerMsg.contains("hủy kết bạn") || lowerMsg.contains("huỷ kết bạn")
//                    || lowerMsg.contains("xóa bạn") || lowerMsg.contains("xoá bạn")) && phone != null) {
//                toolResult = contactTool.removeFriendByPhone(phone, userId);
//            }
//            // 5. Gửi kết bạn (Phải đặt dưới Xóa bạn để tránh bị dính chữ "kết bạn")
//            else if (lowerMsg.contains("kết bạn") && phone != null) {
//                toolResult = contactTool.sendFriendRequestByPhone(phone, userId);
//            }
//            // 6. Thu hồi
//            else if (lowerMsg.contains("thu hồi") && lowerMsg.contains("lời mời") && phone != null) {
//                toolResult = contactTool.revokeFriendRequestByPhone(phone, userId);
//            }
//            // 7. Chấp nhận
//            else if (lowerMsg.contains("chấp nhận") && lowerMsg.contains("lời mời") && phone != null) {
//                toolResult = contactTool.acceptFriendRequestByPhone(phone, userId);
//            }
//            // 8. Thời tiết
//            else if (lowerMsg.contains("thời tiết")) {
//                toolResult = weatherTool.getWeather(extractLocation(request.message()));
//            }
//            // Bắt lệnh tóm tắt tin nhắn
//            if (lowerMsg.contains("tóm tắt") && (lowerMsg.contains("tin nhắn") || lowerMsg.contains("chat") || lowerMsg.contains("đoạn này"))) {
//                System.out.println(">>> [ROUTER] Đã bắt được lệnh TÓM TẮT TIN NHẮN");
//                String transcript = messageTool.getMessageHistory(roomId, userId);
//
//                // Gán kết quả tóm tắt vào biến content
//                content = summarizeWithAI(transcript);
//
//                // QUAN TRỌNG: Phải lưu vào history và return ngay tại đây để tránh chạy xuống logic chat thường
//                saveHistory(userId, request.message(), content);
//                System.out.println(">>> [AI SUMMARY RESULT]: " + content);
//                return content.strip();
//            }
//            // --- XỬ LÝ KẾT QUẢ TOOL ---
//            if (toolResult != null) {
//                System.out.println(">>> [TOOL CHẠY THÀNH CÔNG, KẾT QUẢ]: " + toolResult);
//                String finalResult = formatWithAI(toolResult, request.message(), userId);
//                saveHistory(userId, request.message(), finalResult);
//                return finalResult;
//            }
//
//            // Rơi vào đây nếu không có tool nào khớp
//            System.out.println(">>> [KHÔNG KHỚP TOOL NÀO -> GỌI AI CHÉM GIÓ]");
//            return handleGeneralChat(request, userId, roomId);
//        } catch (Exception e) {
//            e.printStackTrace();
//            return "Lỗi: " + e.getMessage();
//        }
//    }
//
//    private String extractPhone(String msg) {
//        Pattern p = Pattern.compile("(0[0-9]{9,10})");
//        Matcher m = p.matcher(msg);
//        return m.find() ? m.group() : null;
//    }
//
//    private String extractLocation(String msg) {
//        return msg.toLowerCase().contains("hà nội") ? "Ha Noi" : "Ho Chi Minh";
//    }
//
//    // Đã nâng cấp Prompt để không nói "Hệ thống của chúng tôi"
//    private String formatWithAI(String toolResult, String userQuestion, String userId) {
//        String systemPrompt = String.format("""
//            Hãy trả lời thật ngắn gọn, tự nhiên, mang tính trò chuyện dựa vào KẾT QUẢ dưới đây.
//            - KẾT QUẢ LÀ SỰ THẬT DUY NHẤT. Chỉ báo cáo những gì có trong kết quả.
//            - CẤM TUYỆT ĐỐI dùng các từ ngữ như: "hệ thống của chúng tôi", "cơ sở dữ liệu", "vui lòng đăng nhập ứng dụng", "chúng ta cần truy cập".
//
//            [KẾT QUẢ LẤY TỪ DATABASE]: %s
//            """, toolResult);
//
//        List<Message> messages = new ArrayList<>();
//        messages.add(new SystemMessage(systemPrompt));
//        messages.add(new UserMessage(userQuestion));
//        return chatClient.prompt().messages(messages).call().content();
//    }
//
//    private String handleGeneralChat(ChatRequest request, String userId, String roomId) {
//        List<ChatHistory> historyEntities = chatHistoryRepository.findByConversationIdOrderByCreatedAtAsc(userId);
//        List<Message> messages = new ArrayList<>();
//        messages.add(new SystemMessage("Bạn là trợ lý AI thân thiện của Alo Chat. Gọi người dùng là Tấn. Bạn không thể thực hiện các thao tác kết bạn nếu thiếu số điện thoại."));
//        for (ChatHistory h : historyEntities.stream().skip(Math.max(0, historyEntities.size() - 5)).toList()) {
//            if ("user".equals(h.getRole())) messages.add(new UserMessage(h.getContent()));
//            else messages.add(new AssistantMessage(h.getContent()));
//        }
//        messages.add(new UserMessage(request.message()));
//
//        String content = chatClient.prompt().messages(messages).call().content();
//        saveHistory(userId, request.message(), content);
//        return content;
//    }
//
//    private void saveHistory(String userId, String userMsg, String aiMsg) {
//        ChatHistory u = new ChatHistory(); u.setConversationId(userId); u.setRole("user"); u.setContent(userMsg);
//        chatHistoryRepository.save(u);
//        ChatHistory a = new ChatHistory(); a.setConversationId(userId); a.setRole("assistant"); a.setContent(aiMsg);
//        chatHistoryRepository.save(a);
//    }
//    // ========== HÀM CHUYÊN DỤNG ĐỂ TÓM TẮT TIN NHẮN ==========
//    // ========== HÀM CHUYÊN DỤNG ĐỂ TÓM TẮT TIN NHẮN (FULL) ==========
//    private String summarizeWithAI(String transcript) {
//        // 1. Kiểm tra nếu transcript trống hoặc báo lỗi từ MessageTool thì trả về luôn
//        if (transcript == null || transcript.isBlank() ||
//                transcript.contains("chưa có tin nhắn") || transcript.startsWith("Lỗi")) {
//            return transcript;
//        }
//
//        // 2. Thiết lập System Prompt cực mạnh để "ép" AI làm việc đúng ý
//        String systemPrompt = String.format("""
//            Bạn là một trợ lý AI thông minh tích hợp trong ứng dụng Alo Chat.
//            Nhiệm vụ của bạn là đọc kỹ kịch bản đoạn hội thoại dưới đây và cung cấp một bản TÓM TẮT ngắn gọn, súc tích.
//
//            [QUY TẮC TÓM TẮT]:
//            1. Sử dụng gạch đầu dòng (bullet points) để trình bày các ý chính.
//            2. Xác định rõ chủ đề chính của cuộc trò chuyện là gì?
//            3. Phân tích tin nhắn: "TÔI" (người dùng hiện tại) đã nói/quyết định gì? "NGƯỜI KIA" đã phản hồi như thế nào?
//            4. Chỉ tóm tắt các thông tin quan trọng (thỏa thuận, thời gian, địa điểm, quyết định). Bỏ qua các câu chào hỏi xã giao.
//            5. Xưng hô là "mình" hoặc "AI".
//
//            [DỮ LIỆU TIN NHẮN]:
//            %s
//            """, transcript);
//
//        // 3. Tạo danh sách Message gửi cho ChatClient
//        List<Message> messages = new ArrayList<>();
//        messages.add(new SystemMessage(systemPrompt));
//        messages.add(new UserMessage("hãy tóm tắt nội dung cuộc trò chuyện này giúp mình với!"));
//
//        try {
//            // 4. Gọi AI xử lý
//            String content = chatClient.prompt()
//                    .messages(messages)
//                    .call()
//                    .content();
//
//            // In log để ông dễ debug xem AI đã trả về cái gì
//            System.out.println(">>> [AI SUMMARY RESULT]: " + content);
//
//            if (content == null || content.isBlank()) {
//                return "AI đã đọc tin nhắn nhưng không tìm thấy nội dung nào đủ quan trọng để tóm tắt.";
//            }
//
//            return content.strip();
//        } catch (Exception e) {
//            // Trường hợp AI quá tải hoặc lỗi kết nối Model
//            System.err.println(">>> [LỖI TÓM TẮT AI]: " + e.getMessage());
//            return "Xin lỗi, mình đã thử tóm tắt nhưng hệ thống AI đang gặp chút trục trặc. Bạn thử lại sau ít phút nhé!";
//        }
//    }
//}

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

    public ChatService(ChatClient.Builder builder,
                       WeatherToolConfig weatherTool,
                       UserTool userTool,
                       ContactTool contactTool,
                       MessageTool messageTool,
                       ChatHistoryRepository chatHistoryRepository,
                       VectorStore vectorStore,
                       GuidelineTool guidelineTool) {
        this.weatherTool = weatherTool;
        this.userTool = userTool;
        this.contactTool = contactTool;
        this.messageTool = messageTool;
        this.chatHistoryRepository = chatHistoryRepository;
        this.vectorStore = vectorStore;
        this.guidelineTool = guidelineTool;
        this.chatClient = builder.build();
    }

    @Transactional
    public String chat(ChatRequest request) {
        try {
            String userId = request.userId();
            String roomId = (request.roomId() != null) ? request.roomId() : "GLOBAL";
            String lowerMsg = request.message().toLowerCase();
            String toolResult = null;
            String phone = extractPhone(request.message());

            // Lấy tên người dùng (có thể từ UserTool nếu có method)
            String currentUserName = getUserName(userId);

            // 1. Tóm tắt hội thoại
            if (lowerMsg.contains("tóm tắt") && (lowerMsg.contains("tin nhắn") || lowerMsg.contains("chat") || lowerMsg.contains("đoạn này"))) {
                if ("GLOBAL".equals(roomId)) {
                    return currentUserName + " ơi, mình chỉ tóm tắt được trong phòng chat riêng thôi nha!";
                }
                String transcript = messageTool.getMessageHistory(roomId, userId);
                String summary = summarizeConversation(transcript, currentUserName);
                saveHistory(userId, request.message(), summary);
                return summary.strip();
            }

            // 2. Hướng dẫn sử dụng
            if (lowerMsg.contains("hướng dẫn") || lowerMsg.contains("cách sử dụng")
                    || lowerMsg.contains("cách dùng") || lowerMsg.contains("cách xài") || lowerMsg.contains("làm sao để")) {
                toolResult = guidelineTool.readGuidelines();
            }
            // 3. Bạn bè
            else if (lowerMsg.contains("bạn bè") || lowerMsg.contains("danh sách bạn")) {
                toolResult = contactTool.getFriendsList(userId);
            }
            else if ((lowerMsg.contains("hủy kết bạn") || lowerMsg.contains("huỷ kết bạn")
                    || lowerMsg.contains("xóa bạn") || lowerMsg.contains("xoá bạn")) && phone != null) {
                toolResult = contactTool.removeFriendByPhone(phone, userId);
            }
            else if (lowerMsg.contains("kết bạn") && phone != null) {
                toolResult = contactTool.sendFriendRequestByPhone(phone, userId);
            }
            else if (lowerMsg.contains("chấp nhận") && lowerMsg.contains("lời mời") && phone != null) {
                toolResult = contactTool.acceptFriendRequestByPhone(phone, userId);
            }
            // 4. Thời tiết
            else if (lowerMsg.contains("thời tiết")) {
                toolResult = weatherTool.getWeather(extractLocation(request.message()));
            }
            // 5. Giờ, phiên bản
            else if (lowerMsg.contains("mấy giờ")) {
                toolResult = new SystemTool().getCurrentTime();
            }
            else if (lowerMsg.contains("phiên bản")) {
                toolResult = new SystemTool().getAppVersion();
            }

            // Xử lý kết quả tool
            if (toolResult != null) {
                String finalResult = formatToolResult(toolResult, request.message());
                saveHistory(userId, request.message(), finalResult);
                return finalResult;
            }

            // Chat thường
            return handleGeneralChat(request, userId, currentUserName);

        } catch (Exception e) {
            e.printStackTrace();
            return "Lỗi: " + e.getMessage();
        }
    }

    // ========== LẤY TÊN NGƯỜI DÙNG (có thể mở rộng) ==========
    private String getUserName(String userId) {
        try {
            // Giả sử UserTool có method lấy thông tin user
            return userTool.getUserInfo(userId); // Bạn cần implement method này trong UserTool
        } catch (Exception e) {
            return "Tấn";
        }
    }

    // ========== FORMAT KẾT QUẢ TOOL ==========
    private String formatToolResult(String toolResult, String userQuestion) {
        String systemPrompt = String.format("""
            Bạn là trợ lý AI của Alo Chat. Hãy trả lời người dùng một cách tự nhiên, thân thiện, bằng tiếng Việt.
            Dựa vào thông tin sau để trả lời (đây là kết quả từ hệ thống):
            === KẾT QUẢ ===
            %s
            === HẾT ===
            Không giải thích gì thêm, không nhắc đến ID hay tool. Chỉ trả lời trực tiếp.
            """, toolResult);

        List<Message> messages = new ArrayList<>();
        messages.add(new SystemMessage(systemPrompt));
        messages.add(new UserMessage(userQuestion));

        try {
            return chatClient.prompt().messages(messages).call().content();
        } catch (Exception e) {
            return toolResult; // fallback
        }
    }

    // ========== TÓM TẮT HỘI THOẠI ==========
//    private String summarizeConversation(String transcript, String currentUserName) {
//        if (transcript == null || transcript.isBlank() || transcript.contains("chưa có tin nhắn")) {
//            return transcript;
//        }
//
//        String systemPrompt = String.format("""
//            Bạn là trợ lý AI của Alo Chat. Hãy tóm tắt cuộc trò chuyện giữa bạn %s và bạn của bạn.
//            Yêu cầu:
//
//            - Sử dụng gạch đầu dòng.
//            - Xưng hô: "bạn" (chỉ người dùng hiện tại) và "bạn của bạn" (chỉ người kia).
//            - Gọi %s bằng tên.
//            - Nêu rõ chủ đề chính, nội dung trao đổi quan trọng, kết luận (nếu có).
//            - Bỏ qua câu chào hỏi.
//
//            Đoạn hội thoại:
//            %s
//            """, currentUserName, currentUserName, transcript);
//
//        List<Message> messages = new ArrayList<>();
//        messages.add(new SystemMessage(systemPrompt));
//        messages.add(new UserMessage("Hãy tóm tắt cho mình."));
//
//        try {
//            String content = chatClient.prompt().messages(messages).call().content();
//            return content != null ? content.strip() : "Không thể tóm tắt.";
//        } catch (Exception e) {
//            return "Lỗi khi tóm tắt: " + e.getMessage();
//        }
//    }
    private String summarizeConversation(String transcript, String currentUserName) {
        if (transcript == null || transcript.isBlank() || transcript.contains("chưa có tin nhắn")) {
            return transcript;
        }

        String systemPrompt = String.format("""
        Bạn là trợ lý AI của Alo Chat. Hãy tóm tắt cuộc trò chuyện giữa bạn và bạn của bạn .
        Yêu cầu:
        - Xưng hô: "bạn" và "bạn của bạn". KHÔNG dùng tên riêng.
        - Sử dụng gạch đầu dòng.
        - Nêu rõ chủ đề chính, nội dung trao đổi quan trọng.
        - Bỏ qua câu chào hỏi.
        
        Đoạn hội thoại:
        %s
        """, transcript);

        List<Message> messages = new ArrayList<>();
        messages.add(new SystemMessage(systemPrompt));
        messages.add(new UserMessage("Hãy tóm tắt cho mình."));

        try {
            String content = chatClient.prompt().messages(messages).call().content();
            return content != null ? content.strip() : "Không thể tóm tắt.";
        } catch (Exception e) {
            return "Lỗi khi tóm tắt: " + e.getMessage();
        }
    }
    // ========== CHAT THƯỜNG ==========
    private String handleGeneralChat(ChatRequest request, String userId, String userName) {
        List<ChatHistory> history = chatHistoryRepository.findByConversationIdOrderByCreatedAtAsc(userId);
        List<Message> messages = new ArrayList<>();
        messages.add(new SystemMessage("Bạn là trợ lý AI của Alo Chat. Hãy gọi người dùng là " + userName + "."));
        history.stream().skip(Math.max(0, history.size() - 5)).forEach(h -> {
            if ("user".equals(h.getRole())) messages.add(new UserMessage(h.getContent()));
            else messages.add(new AssistantMessage(h.getContent()));
        });
        messages.add(new UserMessage(request.message()));

        String content = chatClient.prompt().messages(messages).call().content();
        saveHistory(userId, request.message(), content);
        return content;
    }

    // ========== LƯU LỊCH SỬ ==========
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

    // ========== UTILS ==========
    private String extractPhone(String msg) {
        Matcher m = Pattern.compile("(0[0-9]{9,10})").matcher(msg);
        return m.find() ? m.group() : null;
    }

    private String extractLocation(String msg) {
        return msg.toLowerCase().contains("hà nội") ? "Hanoi" : "Ho Chi Minh";
    }
}