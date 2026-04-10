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
    public ResponseEntity<ApiResponse<String>> ask(@RequestBody ChatRequest request) {
        String result = chatService.chat(request);
        // ✅ Xóa dấu " thừa nếu AI wrap thêm quotes
        result = result.replaceAll("^\"|\"$", "").replace("\\\"", "\"");
        return ResponseEntity.ok(ApiResponse.success(result));
    }
}