package edu.iuh.fit.api_gateway.filter;

import edu.iuh.fit.api_gateway.config.JwtUtils;
import edu.iuh.fit.api_gateway.config.RouteValidator; // Import con validator vào
import lombok.RequiredArgsConstructor;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@Component
@RequiredArgsConstructor
public class AuthenticationFilter implements GlobalFilter {

    private final JwtUtils jwtUtils;
    private final RouteValidator validator; // Tiêm con validator vào đây

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();

        // 1. Kiểm tra xem Request này có cần bảo mật không (Whitelist check)
        if (validator.isSecured.test(request)) {

            // 2. Lấy Token từ Header
            String authHeader = request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);

            // 3. Nếu không có Token mà vào route bảo mật -> Chặn ngay (Trả về 401)
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
                return exchange.getResponse().setComplete();
            }

            try {
                String token = authHeader.substring(7);
                // 4. Giải mã lấy userId
                String userId = jwtUtils.extractUserId(token);

                // 5. "Dập mộc" X-User-Id vào Header để gửi xuống các service con
                ServerHttpRequest modifiedRequest = exchange.getRequest().mutate()
                        .header("X-User-Id", userId)
                        .build();

                return chain.filter(exchange.mutate().request(modifiedRequest).build());

            } catch (Exception e) {
                // Token lởm hoặc hết hạn
                exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
                return exchange.getResponse().setComplete();
            }
        }

        // Nếu là route công khai (Login/Register) thì cho qua luôn
        return chain.filter(exchange);
    }
}