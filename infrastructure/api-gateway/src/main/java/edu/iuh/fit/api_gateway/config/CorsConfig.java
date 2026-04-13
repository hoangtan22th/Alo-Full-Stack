package edu.iuh.fit.api_gateway.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsWebFilter;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
public class CorsConfig {

    @Bean
    public CorsWebFilter corsWebFilter() {
        CorsConfiguration config = new CorsConfiguration();

        // Sử dụng AllowedOriginPatterns để cho phép tất cả các domain (kể cả wildcard)
        // Điều này đặc biệt cần thiết khi allowCredentials = true
        config.setAllowedOriginPatterns(List.of("*"));

        // Các HTTP method được phép
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"));

        // Cho phép tất cả Header (bao gồm Authorization, Content-Type, ...)
        config.setAllowedHeaders(List.of("*"));

        // Cho phép gửi Cookie/Credentials
        config.setAllowCredentials(true);

        // Expose header để Frontend đọc được
        config.setExposedHeaders(List.of("Authorization", "X-User-Id"));

        // Cache preflight 1 giờ
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);

        return new CorsWebFilter(source);
    }
}
