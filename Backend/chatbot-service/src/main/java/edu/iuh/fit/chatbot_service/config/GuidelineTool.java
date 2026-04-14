package edu.iuh.fit.chatbot_service.config;

import org.springframework.ai.tool.annotation.Tool;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import java.nio.charset.StandardCharsets;

@Component
public class GuidelineTool {
    private static String guidelines = null;

    @Tool(description = "Đọc hướng dẫn sử dụng app Alo Chat. Gọi khi người dùng hỏi về cách dùng, vị trí nút bấm, thao tác giao diện.")
    public String readGuidelines() {
        if (guidelines == null) {
            try {
                var resource = new ClassPathResource("guidelines.txt");
                guidelines = new String(resource.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            } catch (Exception e) {
                guidelines = "Không thể tải hướng dẫn. Vui lòng thử lại sau.";
            }
        }
        return guidelines;
    }
}