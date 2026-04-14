//package edu.iuh.fit.chatbot_service.service;
//
//import org.springframework.ai.chat.messages.AssistantMessage;
//import org.springframework.ai.chat.messages.Message;
//import org.springframework.ai.chat.messages.UserMessage;
//import org.springframework.stereotype.Service;
//import java.util.*;
//import java.util.concurrent.ConcurrentHashMap;
//
//@Service
//public class ConversationMemoryService {
//    private final Map<String, List<Message>> conversationHistory = new ConcurrentHashMap<>();
//
//    public void addToHistory(String conversationId, Message message) {
//        List<Message> history = conversationHistory.computeIfAbsent(conversationId, k -> new ArrayList<>());
//        history.add(message);
//        // Giữ tối đa 20 tin nhắn gần nhất
//        while (history.size() > 20) {
//            history.remove(0);
//        }
//    }
//
//    public List<Message> getConversationHistory(String conversationId) {
//        return conversationHistory.getOrDefault(conversationId, Collections.emptyList());
//    }
//
//    public void clearHistory(String conversationId) {
//        conversationHistory.remove(conversationId);
//    }
//}