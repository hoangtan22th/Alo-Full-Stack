package edu.iuh.fit.chatbot_service.client;

import edu.iuh.fit.common_service.dto.response.PageResponse;
import edu.iuh.fit.chatbot_service.dto.UserDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(name = "user-service")
public interface UserClient {
    @GetMapping("/api/v1/users/search")
    PageResponse<UserDto> searchUsers(
            @RequestParam(required = false) String fullName,
            @RequestParam(required = false) String email,
            @RequestParam(required = false) String phoneNumber,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    );
}