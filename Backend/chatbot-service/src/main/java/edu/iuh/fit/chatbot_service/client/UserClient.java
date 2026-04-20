package edu.iuh.fit.chatbot_service.client;

import edu.iuh.fit.common_service.dto.response.ApiResponse;
import edu.iuh.fit.common_service.dto.response.PageResponse;
import edu.iuh.fit.chatbot_service.dto.UserDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import java.util.List;

@FeignClient(name = "user-service")
public interface UserClient {
    @GetMapping("/api/v1/users/search")
    ApiResponse<PageResponse<UserDto>> searchUsers(
            @RequestParam(required = false) String fullName,
            @RequestParam(required = false) String email,
            @RequestParam(required = false) String phoneNumber,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    );

    @GetMapping("/api/v1/users/{id}")
    ApiResponse<UserDto> getUserById(@PathVariable("id") String id);

    @PostMapping("/api/v1/users/by-ids")
    ApiResponse<List<UserDto>> getUsersByIds(@RequestBody List<String> ids);
}