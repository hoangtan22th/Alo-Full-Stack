//package edu.iuh.fit.chatbot_service.config;
//
//import org.springframework.ai.tool.annotation.Tool;
//import org.springframework.stereotype.Component;
//import org.springframework.web.client.RestTemplate;
//
//import java.util.List;
//import java.util.Map;
//
//// ✅ FIX 1: Tách WeatherRequest ra ngoài, không lồng trong class khác
//record WeatherRequest(String location) {}
//
//// ✅ FIX 2: Dùng @Component để Spring quản lý, @Tool mới được scan đúng
//@Component
//public class WeatherToolConfig {
//
//    private static final String API_KEY = "8a03f07eaa06f3dbe89e082f462c7eac"; // ✅ FIX 3
//
//    @Tool(description = """
//            Gọi tool này để lấy thông tin thời tiết thực tế hiện tại của một thành phố.
//            Bắt buộc dùng tool này khi người dùng hỏi về thời tiết, nhiệt độ, mưa, nắng.
//            Nếu không có địa điểm cụ thể, mặc định dùng 'Ho Chi Minh'.
//            """)
//    public String getWeather(WeatherRequest request) {
//        String location = request.location() != null ? request.location() : "Ho Chi Minh";
//
//        System.out.println(">>> [TOOL CALLED] getWeather - địa điểm: " + location);
//
//        try {
//            RestTemplate restTemplate = new RestTemplate();
//            String url = String.format(
//                    "https://api.openweathermap.org/data/2.5/weather?q=%s&appid=%s&units=metric&lang=vi",
//                    location, API_KEY
//            );
//
//            Map<String, Object> response = restTemplate.getForObject(url, Map.class);
//
//            if (response == null || !response.containsKey("main")) {
//                return "Không tìm thấy dữ liệu thời tiết cho: " + location;
//            }
//
//            Map<String, Object> main = (Map<String, Object>) response.get("main");
//            double temp       = Double.parseDouble(main.get("temp").toString());
//            double feelsLike  = Double.parseDouble(main.get("feels_like").toString());
//            int    humidity   = Integer.parseInt(main.get("humidity").toString());
//
//            List<Map<String, Object>> weatherList = (List<Map<String, Object>>) response.get("weather");
//            String desc = weatherList.get(0).get("description").toString();
//
//            return String.format(
//                    "Thời tiết tại %s: %.1f°C (cảm giác như %.1f°C), độ ẩm %d%%, %s.",
//                    location, temp, feelsLike, humidity, desc
//            );
//
//        } catch (Exception e) {
//            System.err.println(">>> [ERROR] " + e.getMessage());
//            return "Lỗi khi lấy dữ liệu thời tiết: " + e.getMessage();
//        }
//    }
//}
package edu.iuh.fit.chatbot_service.config;

import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import java.util.List;
import java.util.Map;

@Component
public class WeatherToolConfig {
    private static final String API_KEY = "8a03f07eaa06f3dbe89e082f462c7eac";

    // [FIX] Cập nhật mô tả để AI biết đường hỏi lại thay vì gọi bừa API
    @Tool(description = "Lấy thời tiết. BẮT BUỘC phải biết tên thành phố. Nếu người dùng chỉ nói 'thời tiết hôm nay', hãy ngưng gọi tool và HỎI LẠI họ muốn xem thời tiết ở đâu.")
    public String getWeather(
            @ToolParam(description = "Tên thành phố không dấu (ví dụ: Ha Noi, Da Nang)", required = true) String location) {

        System.out.println(">>> [TOOL CALLED] getWeather - location: " + location);
        try {
            RestTemplate rest = new RestTemplate();
            String url = String.format("https://api.openweathermap.org/data/2.5/weather?q=%s&appid=%s&units=metric&lang=vi", location, API_KEY);
            Map<String, Object> resp = rest.getForObject(url, Map.class);
            if (resp == null || !resp.containsKey("main")) return "Không tìm thấy thành phố " + location;

            Map<String, Object> main = (Map<String, Object>) resp.get("main");
            double temp = Double.parseDouble(main.get("temp").toString());
            String desc = (String) ((List<Map<String, Object>>) resp.get("weather")).get(0).get("description");

            return String.format("🌤 Thời tiết tại %s: %.1f°C, %s.", location, temp, desc);
        } catch (Exception e) {
            return "Lỗi khi lấy thời tiết: " + e.getMessage();
        }
    }
}