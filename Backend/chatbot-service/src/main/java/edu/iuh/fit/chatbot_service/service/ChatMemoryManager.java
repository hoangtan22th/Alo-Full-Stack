package edu.iuh.fit.chatbot_service.service;

import org.springframework.stereotype.Service;
import java.util.HashMap;
import java.util.Map;

@Service
public class ChatMemoryManager {

    private final MemoryVectorService memoryVectorService;

    public ChatMemoryManager(MemoryVectorService memoryVectorService) {
        this.memoryVectorService = memoryVectorService;
    }

    public void saveConversationTurn(String userId, String userMessage, String aiResponse) {
        String content = String.format("Người dùng hỏi: %s\nTrợ lý trả lời: %s", userMessage, aiResponse);
        Map<String, Object> metadata = new HashMap<>();
        metadata.put("userId", userId);
        metadata.put("timestamp", System.currentTimeMillis());
        metadata.put("type", "conversation");
        memoryVectorService.saveMemory(content, metadata);
    }

    public String retrieveContext(String userId, String userMessage) {
        var memories = memoryVectorService.findRelevantMemories(userMessage, userId, 3);
        if (memories.isEmpty()) return "";
        StringBuilder context = new StringBuilder("Dựa trên các cuộc trò chuyện trước đó:\n");
        for (var mem : memories) {
            context.append("- ").append(mem.getText()).append("\n");
        }
        return context.toString();
    }
}