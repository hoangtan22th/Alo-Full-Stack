package edu.iuh.fit.contact_service.client;

import edu.iuh.fit.common_service.dto.response.ApiResponse;
import edu.iuh.fit.contact_service.dto.response.UserDTO;
import edu.iuh.fit.contact_service.config.FeignClientConfig; // Import config mới
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@FeignClient(
        name = "auth-service",
        url = "http://localhost:8888/api-gateway/auth-service", // Gọi qua Gateway chuẩn bài
        configuration = FeignClientConfig.class // Kích hoạt Token Relay
)
public interface UserClient {

    @GetMapping("/auth/search")
    ApiResponse<UserDTO> getUserByPhone(@RequestParam("phone") String phone);

    @PostMapping("/auth/users/by-ids")
    List<UserDTO> getUsersByIds(@RequestBody List<String> ids);
}