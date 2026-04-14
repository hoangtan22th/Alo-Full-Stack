package edu.iuh.fit.chatbot_service.config;

import org.springframework.ai.tool.annotation.Tool;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

// ✅ FIX 1: Tách WeatherRequest ra ngoài, không lồng trong class khác
record WeatherRequest(String location) {}

// ✅ FIX 2: Dùng @Component để Spring quản lý, @Tool mới được scan đúng
@Component
public class WeatherToolConfig {

    private static final String API_KEY = "8a03f07eaa06f3dbe89e082f462c7eac"; // ✅ FIX 3

    @Tool(description = """
            Gọi tool này để lấy thông tin thời tiết thực tế hiện tại của một thành phố.
            Bắt buộc dùng tool này khi người dùng hỏi về thời tiết, nhiệt độ, mưa, nắng.
            Nếu không có địa điểm cụ thể, mặc định dùng 'Ho Chi Minh'.
            """)
    public String getWeather(WeatherRequest request) {
        String location = request.location() != null ? request.location() : "Ho Chi Minh";

        System.out.println(">>> [TOOL CALLED] getWeather - địa điểm: " + location);

        try {
            RestTemplate restTemplate = new RestTemplate();
            String url = String.format(
                    "https://api.openweathermap.org/data/2.5/weather?q=%s&appid=%s&units=metric&lang=vi",
                    location, API_KEY
            );

            Map<String, Object> response = restTemplate.getForObject(url, Map.class);

            if (response == null || !response.containsKey("main")) {
                return "Không tìm thấy dữ liệu thời tiết cho: " + location;
            }

            Map<String, Object> main = (Map<String, Object>) response.get("main");
            double temp       = Double.parseDouble(main.get("temp").toString());
            double feelsLike  = Double.parseDouble(main.get("feels_like").toString());
            int    humidity   = Integer.parseInt(main.get("humidity").toString());

            List<Map<String, Object>> weatherList = (List<Map<String, Object>>) response.get("weather");
            String desc = weatherList.get(0).get("description").toString();

            return String.format(
                    "Thời tiết tại %s: %.1f°C (cảm giác như %.1f°C), độ ẩm %d%%, %s.",
                    location, temp, feelsLike, humidity, desc
            );

        } catch (Exception e) {
            System.err.println(">>> [ERROR] " + e.getMessage());
            return "Lỗi khi lấy dữ liệu thời tiết: " + e.getMessage();
        }
    }
}
