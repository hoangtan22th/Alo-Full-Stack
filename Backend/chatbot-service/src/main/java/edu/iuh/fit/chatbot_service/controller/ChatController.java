package edu.iuh.fit.chatbot_service.controller;

import edu.iuh.fit.common_service.dto.response.ApiResponse;
import edu.iuh.fit.chatbot_service.dto.ChatRequest;
import edu.iuh.fit.chatbot_service.service.ChatService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/chatbot")
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @PostMapping("/ask")
    public ResponseEntity<ApiResponse<String>> ask(
            @RequestBody ChatRequest request,
            @RequestHeader(value = "X-User-Id", required = false) String headerUserId) {

        String finalUserId = (request.userId() != null && !request.userId().isBlank())
                ? request.userId() : headerUserId;
        if (finalUserId == null || finalUserId.isBlank()) {
            return ResponseEntity.status(401).body(ApiResponse.error(401, "Không xác định được người dùng"));
        }

        var fullRequest = new ChatRequest(request.message(), finalUserId);
        String result = chatService.chat(fullRequest);
        result = result.replaceAll("^\"|\"$", "").replace("\\\"", "\"");
        return ResponseEntity.ok(ApiResponse.success(result));
    }
}