package edu.iuh.fit.report_service.client;

import edu.iuh.fit.common_service.dto.response.ApiResponse;
import edu.iuh.fit.report_service.dto.response.UserResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class UserClientFallback implements UserClient {
    @Override
    public ApiResponse<UserResponse> getUserById(Long id) {
        log.warn("Fallback called for getting UserId {}", id);
        UserResponse fallbackUser = UserResponse.builder()
                .id(id)
                .name("Unknown User")
                .avatar(null)
                .build();
        return ApiResponse.success(fallbackUser);
    }
}
