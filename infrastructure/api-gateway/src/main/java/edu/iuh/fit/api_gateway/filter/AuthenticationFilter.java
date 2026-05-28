package edu.iuh.fit.api_gateway.filter;

import edu.iuh.fit.api_gateway.config.JwtUtils;
import edu.iuh.fit.api_gateway.config.RouteValidator;
import lombok.RequiredArgsConstructor;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;

@Component
@RequiredArgsConstructor
public class AuthenticationFilter implements GlobalFilter {

    private final JwtUtils jwtUtils;
    private final RouteValidator validator;
    private final org.springframework.data.redis.core.ReactiveStringRedisTemplate redisTemplate;

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        // Chấp nhận mọi request OPTIONS để fix lỗi CORS Preflight
        if (request.getMethod().name().equals("OPTIONS")) {
            return chain.filter(exchange);
        }
        // 1. Kiểm tra xem Request này có cần bảo mật không (Whitelist check)
        if (validator.isSecured.test(request)) {

            // 2. Lấy Token từ Header
            String authHeader = request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);

            // 3. Nếu không có Token mà vào route bảo mật -> Chặn ngay (Trả về 401)
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return unauthorizedResponse(exchange, "Thiếu Access Token");
            }

            try {
                String token = authHeader.substring(7);
                // 4. Giải mã lấy userId và sessionId
                String userId = jwtUtils.extractUserId(token);
                String sessionId = jwtUtils.extractSessionId(token);
                String roles = jwtUtils.extractRoles(token);

                // Admin route authorization check
                if (request.getURI().getPath().startsWith("/api/v1/admin/") && (roles == null || !roles.contains("ADMIN"))) {
                    return forbiddenResponse(exchange, "Forbidden: Bạn không có quyền truy cập chức năng này.");
                }

                // Kiểm tra xem sessionId có nằm trong Blacklist của Redis không
                if (sessionId != null) {
                    return redisTemplate.hasKey("BLACKLIST_SESSION:" + sessionId)
                            .flatMap(isBlacklisted -> {
                                if (Boolean.TRUE.equals(isBlacklisted)) {
                                    return unauthorizedResponse(exchange, "Phiên đăng nhập đã bị vô hiệu hóa.");
                                }
                                
                                // Nếu không bị blacklist thì đi tiếp
                                ServerHttpRequest modifiedRequest = exchange.getRequest().mutate()
                                        .header("X-User-Id", userId)
                                        .header("X-Session-Id", sessionId)
                                        .header("X-User-Roles", roles)
                                        .build();
                                return chain.filter(exchange.mutate().request(modifiedRequest).build());
                            });
                }

                // 5. "Dập mộc" X-User-Id vào Header để gửi xuống các service con
                ServerHttpRequest modifiedRequest = exchange.getRequest().mutate()
                        .header("X-User-Id", userId)
                        .header("X-Session-Id", sessionId)
                        .header("X-User-Roles", roles)
                        .build();

                return chain.filter(exchange.mutate().request(modifiedRequest).build());

            } catch (Exception e) {
                System.out.println("Lỗi xác thực Token: " + e.getMessage());
                return unauthorizedResponse(exchange, "Token không hợp lệ hoặc đã hết hạn");
            }
        }

        // Nếu là route công khai (Login/Register) thì cho qua luôn
        return chain.filter(exchange);
    }

    /**
     * Trả về response 401 kèm body JSON cho Frontend dễ dàng bắt lỗi
     */
    private Mono<Void> unauthorizedResponse(ServerWebExchange exchange, String message) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(HttpStatus.UNAUTHORIZED);
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);

        String body = "{\"status\":401,\"message\":\"" + message + "\"}";
        DataBuffer buffer = response.bufferFactory().wrap(body.getBytes(StandardCharsets.UTF_8));
        return response.writeWith(Mono.just(buffer));
    }

    /**
     * Trả về response 403 Forbidden
     */
    private Mono<Void> forbiddenResponse(ServerWebExchange exchange, String message) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(HttpStatus.FORBIDDEN);
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);

        String body = "{\"status\":403,\"message\":\"" + message + "\"}";
        DataBuffer buffer = response.bufferFactory().wrap(body.getBytes(StandardCharsets.UTF_8));
        return response.writeWith(Mono.just(buffer));
    }
}