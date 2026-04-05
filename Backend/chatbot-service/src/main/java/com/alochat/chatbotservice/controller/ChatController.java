package com.alochat.chatbotservice.controller;

import com.alochat.chatbotservice.dto.ChatRequest;
import com.alochat.chatbotservice.service.ChatService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ChatController {
    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }


    @PostMapping("/chat")
    String chat(@RequestBody ChatRequest chatRequest) {
        return chatService.chat(chatRequest);
    }
}
