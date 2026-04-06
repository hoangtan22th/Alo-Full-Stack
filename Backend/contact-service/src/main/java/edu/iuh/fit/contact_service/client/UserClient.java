package edu.iuh.fit.contact_service.client;

import edu.iuh.fit.common_service.dto.response.ApiResponse;
import edu.iuh.fit.contact_service.dto.response.UserDTO;
import edu.iuh.fit.contact_service.config.FeignClientConfig; // Import config mới
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@FeignClient(
        name = "auth-service",
        configuration = FeignClientConfig.class // Kích hoạt Token Relay
)
public interface UserClient {

    @GetMapping("/api/v1/auth/search")
    ApiResponse<UserDTO> getUserByPhone(@RequestParam("phone") String phone);

    @PostMapping("/api/v1/auth/users/by-ids")
    ApiResponse<List<UserDTO>> getUsersByIds(@RequestBody List<String> ids);
}