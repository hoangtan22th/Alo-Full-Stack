package edu.iuh.fit.chatbot_service.config;

import org.springframework.ai.tool.annotation.Tool;
import org.springframework.stereotype.Component;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Component
public class SystemTool {
    @Tool(description = "Lấy thời gian hiện tại của server.")
    public String getCurrentTime() {
        System.out.println(">>> [TOOL CALLED] getCurrentTime");
        return LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss dd/MM/yyyy"));
    }
    @Tool(description = "Lấy phiên bản ứng dụng.")
    public String getAppVersion() {
        System.out.println(">>> [TOOL CALLED] getAppVersion");
        return "Alo Chat phiên bản 2.1.0";
    }
}