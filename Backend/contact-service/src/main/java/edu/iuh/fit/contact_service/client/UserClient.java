package edu.iuh.fit.contact_service.client;

import edu.iuh.fit.common_service.dto.response.ApiResponse;
import edu.iuh.fit.common_service.dto.response.PageResponse;
import edu.iuh.fit.contact_service.dto.response.UserDTO;
import edu.iuh.fit.contact_service.config.FeignClientConfig; // Import config mới
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@FeignClient(
        name = "user-service",
        configuration = FeignClientConfig.class // Kích hoạt Token Relay
)
public interface UserClient {

    @GetMapping("/api/v1/users/search")
    ApiResponse<PageResponse<UserDTO>> getUserByPhone(@RequestParam("phoneNumber") String phoneNumber);

    @PostMapping("/api/v1/users/by-ids")
    ApiResponse<List<UserDTO>> getUsersByIds(@RequestBody List<String> ids);
}