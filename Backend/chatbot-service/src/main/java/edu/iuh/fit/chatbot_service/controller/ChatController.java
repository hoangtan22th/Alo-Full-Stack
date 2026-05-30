package edu.iuh.fit.chatbot_service.controller;

import edu.iuh.fit.chatbot_service.entity.ChatHistory;
import edu.iuh.fit.common_service.dto.response.ApiResponse;
import edu.iuh.fit.chatbot_service.dto.ChatRequest;
import edu.iuh.fit.chatbot_service.dto.ModerationRequest;
import edu.iuh.fit.chatbot_service.service.ChatService;
import edu.iuh.fit.chatbot_service.service.ModerationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/chatbot")
public class ChatController {

    private final ChatService chatService;
    private final ModerationService moderationService;
    private final edu.iuh.fit.chatbot_service.service.ReportAnalysisService reportAnalysisService;

    public ChatController(ChatService chatService, ModerationService moderationService, edu.iuh.fit.chatbot_service.service.ReportAnalysisService reportAnalysisService) {
        this.chatService = chatService;
        this.moderationService = moderationService;
        this.reportAnalysisService = reportAnalysisService;
    }

    @PostMapping("/ask")
    public ResponseEntity<ApiResponse<String>> ask(
            @RequestBody ChatRequest request,
            @RequestHeader(value = "X-User-Id", required = false) String headerUserId) {

        String finalUserId = (request.userId() != null && !request.userId().isBlank())
                ? request.userId() : headerUserId;

        if (finalUserId == null || finalUserId.isBlank()) {
            return ResponseEntity.status(401)
                    .body(ApiResponse.error(401, "Không xác định được ID người dùng. Vui lòng đăng nhập lại."));
        }

        ChatRequest fullRequest = new ChatRequest(
                request.message(),
                finalUserId,
                request.roomId(),
                request.context()
        );

        String result = chatService.chat(fullRequest);

        if (result == null || result.isBlank()) {
            result = "Alo Bot hiện tại không thể phản hồi câu hỏi này. Bạn thử hỏi về tính năng của app nhé!";
        } else {
            result = result.strip();
        }

        return ResponseEntity.ok(ApiResponse.success(result));
    }

    // API lấy lịch sử chat với Bot
    @GetMapping("/history/{userId}")
    public ResponseEntity<ApiResponse<List<ChatHistory>>> getHistory(@PathVariable String userId) {
        List<ChatHistory> history = chatService.getHistory(userId);
        return ResponseEntity.ok(ApiResponse.success(history));
    }

    // API kiểm duyệt tin nhắn tự động từ các dịch vụ khác (như message-service)
    @PostMapping("/moderate")
    public ResponseEntity<ApiResponse<Map<String, Object>>> moderateMessage(@RequestBody ModerationRequest request) {
        Map<String, Object> result = moderationService.moderateMessage(request);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    // API phân tích chi tiết report vi phạm bằng AI Agent ngầm kết hợp đếm tiền án
    @PostMapping("/analyze-report")
    public ResponseEntity<ApiResponse<edu.iuh.fit.chatbot_service.dto.AiAnalysisResponseDTO>> analyzeReport(
            @RequestBody edu.iuh.fit.chatbot_service.dto.ReportAnalysisRequestDTO request) {
        edu.iuh.fit.chatbot_service.dto.AiAnalysisResponseDTO response = reportAnalysisService.analyzeReport(request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}