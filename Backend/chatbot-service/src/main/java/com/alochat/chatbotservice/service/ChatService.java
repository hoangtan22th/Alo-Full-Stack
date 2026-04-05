package com.alochat.chatbotservice.service;

import com.alochat.chatbotservice.dto.ChatRequest;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;

@Service
public class ChatService {
    private final ChatClient chatClient;

    public ChatService(ChatClient.Builder builder) {
        chatClient = builder.build();
    }

    public String chat(ChatRequest chatRequest) {
        return chatClient.prompt(chatRequest.message()).call().content();
    }
}
