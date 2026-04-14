//package edu.iuh.fit.chatbot_service.memory;
//
//import org.springframework.ai.chat.memory.ChatMemory;
//import org.springframework.ai.chat.messages.Message;
//import java.util.*;
//
//public class InMemoryChatMemory implements ChatMemory {
//    private final Map<String, List<Message>> conversationHistory = new HashMap<>();
//    private final int maxHistorySize;
//
//    public InMemoryChatMemory() {
//        this(10);
//    }
//
//    public InMemoryChatMemory(int maxHistorySize) {
//        this.maxHistorySize = maxHistorySize;
//    }
//
//    @Override
//    public void add(String conversationId, List<Message> messages) {
//        List<Message> history = conversationHistory.computeIfAbsent(conversationId, k -> new ArrayList<>());
//        history.addAll(messages);
//        // Giữ chỉ `maxHistorySize` tin nhắn gần nhất
//        while (history.size() > maxHistorySize) {
//            history.remove(0);
//        }
//    }
//
//    @Override
//    public List<Message> get(String conversationId) {
//        // Lấy tất cả tin nhắn (giới hạn bởi maxHistorySize)
//        return get(conversationId, maxHistorySize);
//    }
//
//    @Override
//    public List<Message> get(String conversationId, int lastMessages) {
//        List<Message> history = conversationHistory.getOrDefault(conversationId, Collections.emptyList());
//        if (lastMessages <= 0 || lastMessages >= history.size()) {
//            return new ArrayList<>(history);
//        }
//        return new ArrayList<>(history.subList(history.size() - lastMessages, history.size()));
//    }
//
//    @Override
//    public void clear(String conversationId) {
//        conversationHistory.remove(conversationId);
//    }
//}