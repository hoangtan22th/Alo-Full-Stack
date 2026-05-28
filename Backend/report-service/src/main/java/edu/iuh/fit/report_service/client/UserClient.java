package edu.iuh.fit.report_service.client;

import edu.iuh.fit.common_service.dto.response.ApiResponse;
import edu.iuh.fit.report_service.config.FeignConfig;
import edu.iuh.fit.report_service.dto.response.UserResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

/**
 * FeignClient to call user-service.
 *
 * configuration = FeignConfig.class applies the BearerTokenRelayInterceptor
 * which forwards the incoming JWT to user-service for authentication.
 *
 * fallback = UserClientFallback.class handles cases where user-service
 * is unavailable (circuit breaker / Resilience4j).
 */
@FeignClient(
        name = "user-service",
        configuration = FeignConfig.class,
        fallback = UserClientFallback.class
)
public interface UserClient {

    @GetMapping("/api/v1/users/{id}")
    ApiResponse<UserResponse> getUserById(@PathVariable("id") String id);
}
