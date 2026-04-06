package edu.iuh.fit.contact_service.config;

import feign.RequestInterceptor;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Configuration
public class FeignClientConfig {

    @Bean
    public RequestInterceptor requestInterceptor() {
        return requestTemplate -> {
            ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attributes != null) {
                HttpServletRequest request = attributes.getRequest();
                // Lấy header Authorization từ request của React gửi lên
                String authHeader = request.getHeader("Authorization");
                if (authHeader != null) {
                    // Chuyển tiếp (Relay) Token sang cuộc gọi Feign
                    requestTemplate.header("Authorization", authHeader);
                }
            }
        };
    }
}