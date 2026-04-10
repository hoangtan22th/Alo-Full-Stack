package edu.iuh.fit.chatbot_service.service;

import edu.iuh.fit.chatbot_service.config.WeatherToolConfig; // ✅ Import class chính
import edu.iuh.fit.chatbot_service.dto.ChatRequest;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
public class ChatService {

    private final ChatClient chatClient;
    private final WeatherToolConfig weatherToolConfig; // ✅ Inject đúng Bean

    public ChatService(ChatClient.Builder builder, WeatherToolConfig weatherToolConfig) {
        this.weatherToolConfig = weatherToolConfig;

        String currentDateTime = LocalDateTime.now()
                .format(DateTimeFormatter.ofPattern("EEEE, 'ngày' dd 'tháng' MM 'năm' yyyy, HH:mm"));

        this.chatClient = builder
                .defaultSystem("""
                    Bạn là Trợ lý AI của Alo Chat.
                    
                    THÔNG TIN HỆ THỐNG:
                    - Thời gian hiện tại: %s
                    - Vị trí mặc định: Ho Chi Minh
                    
                    QUY ĐỊNH BẮT BUỘC:
                    - Hỏi thời tiết hôm nay/hiện tại → GỌI NGAY tool 'getWeather'
                    - Hỏi thời tiết ngày mai/ngày cụ thể → GỌI NGAY tool 'getWeatherForecast'
                    - Tự chuyển 'ngày mai', 'ngày kia' thành yyyy-MM-dd dựa vào thời gian hệ thống
                    - TUYỆT ĐỐI không tự bịa thông tin thời tiết
                    """.formatted(currentDateTime))
                .build();
    }

    public String chat(ChatRequest chatRequest) {
        try {
            String content = chatClient.prompt()
                    .user(chatRequest.message())
                    .tools(weatherToolConfig) // ✅ Truyền @Component Bean, Spring AI tự scan @Tool
                    .call()
                    .content();

            return content != null ? content.strip().replaceAll("^\"|\"$", "") : "";
        } catch (Exception e) {
            e.printStackTrace();
            return "Xin lỗi, đã có lỗi: " + e.getMessage();
        }
    }
}