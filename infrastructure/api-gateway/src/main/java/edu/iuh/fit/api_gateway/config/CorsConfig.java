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

        // Cho phép Frontend React/Vite (dev) và Mobile gọi API
        config.setAllowedOrigins(List.of(
                "http://localhost:5173",   // React Vite dev
                "http://localhost:3000",   // React CRA dev (nếu dùng)
                "http://localhost:19006"   // Expo Mobile dev
        ));

        // Các HTTP method được phép
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));

        // Cho phép tất cả Header (bao gồm Authorization cho JWT)
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
