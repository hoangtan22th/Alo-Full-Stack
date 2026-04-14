//package edu.iuh.fit.chatbot_service.config;
//
//import edu.iuh.fit.chatbot_service.service.ConversationMemoryService;
//import org.springframework.ai.tool.annotation.Tool;
//import org.springframework.ai.tool.annotation.ToolParam;
//import org.springframework.stereotype.Component;
//
//@Component
//public class MemoryTool {
//    private final ConversationMemoryService memoryService;
//    public MemoryTool(ConversationMemoryService memoryService) { this.memoryService = memoryService; }
//
//    @Tool(description = "Ghi nhớ thông tin do người dùng cung cấp.")
//    public String remember(@ToolParam(description = "Conversation ID") String convId,
//                           @ToolParam(description = "Thông tin cần nhớ") String info) {
//        memoryService.save(convId, info);
//        return "📝 Đã ghi nhớ: " + info;
//    }
//
//    @Tool(description = "Nhắc lại những thông tin đã được ghi nhớ.")
//    public String recall(String convId) {
//        var memories = memoryService.get(convId);
//        if (memories.isEmpty()) return "Chưa có thông tin nào được ghi nhớ.";
//        return "🧠 Những điều tôi nhớ:\n- " + String.join("\n- ", memories);
//    }
//}