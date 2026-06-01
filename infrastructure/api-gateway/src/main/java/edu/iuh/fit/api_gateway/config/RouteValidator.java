package edu.iuh.fit.api_gateway.config;

import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import java.util.List;
import java.util.function.Predicate;

@Component
public class RouteValidator {
    // Danh sách các API không cần kiểm tra Token
    public static final List<String> openApiEndpoints = List.of(
            "/api/v1/auth/register",
            "/api/v1/auth/send-otp",
            "/api/v1/auth/forgot-password/send-otp",
            "/api/v1/auth/forgot-password/reset",
            "/api/v1/auth/login",
            "/api/v1/admin/auth/login",
            "/api/v1/auth/google",
            "/api/v1/auth/refresh",
            "/api/v1/auth/qr/generate",
            "/api/v1/auth/qr/status",
            "/eureka"
    );

    // Danh sách các API endpoint suffix được truy cập công khai (không cần token)
    public static final List<String> openApiSuffixes = List.of(
            "/link-info"  // cho phép GET /api/v1/groups/{groupId}/link-info không cần auth
    );

    public Predicate<ServerHttpRequest> isSecured =
            request -> {
                String path = request.getURI().getPath();
                // Kiểm tra exact match với openApiEndpoints
                boolean isOpenEndpoint = openApiEndpoints.stream()
                        .anyMatch(path::startsWith);
                if (isOpenEndpoint) return false;
                // Kiểm tra suffix match (cho path variable routes như /groups/{id}/link-info)
                boolean isOpenSuffix = openApiSuffixes.stream()
                        .anyMatch(path::endsWith);
                return !isOpenSuffix;
            };
}