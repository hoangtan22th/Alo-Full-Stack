package edu.iuh.fit.api_gateway.filter;

import edu.iuh.fit.api_gateway.config.JwtUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.http.HttpHeaders;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@Component
@RequiredArgsConstructor
public class AuthenticationFilter implements GlobalFilter {

    private final JwtUtils jwtUtils;

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();

        // 1. Dùng getFirst để lấy Token, nếu null tức là không có Header đó
        String authHeader = request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);

        // 2. Kiểm tra xem có Header hoặc có bắt đầu bằng Bearer không
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            // Nếu không có Token, ông có thể chặn lại (trả về 401) hoặc cho đi tiếp tùy logic
            // Ở đây tạm cho đi tiếp, nhưng các service sau sẽ ko có X-User-Id
            return chain.filter(exchange);
        }

        try {
            String token = authHeader.substring(7);

            String userId = jwtUtils.extractUserId(token);

            ServerHttpRequest modifiedRequest = exchange.getRequest().mutate()
                    .header("X-User-Id", userId)
                    .build();

            return chain.filter(exchange.mutate().request(modifiedRequest).build());

        } catch (Exception e) {
            // Nếu Token lởm, hết hạn... thì log ra hoặc xử lý lỗi
            System.err.println("Lỗi giải mã Token: " + e.getMessage());
            return chain.filter(exchange);
        }
    }
}