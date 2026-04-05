package edu.iuh.fit.auth_service.configuration;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // Tạm thời tắt bảo vệ CSRF để dễ dàng test các lệnh POST/PUT qua Postman
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth
                        // Cho phép tất cả mọi người truy cập vào endpoint /ping mà không cần token/login
                        .requestMatchers("/ping").permitAll()

                        // Mở sẵn đường cho các API đăng nhập/đăng ký sau này bạn sẽ viết
                        // .requestMatchers("/login", "/register").permitAll()

                        // Tất cả các request khác (nếu có) vẫn sẽ bị khóa và yêu cầu xác thực
                        .anyRequest().authenticated()
                );

        return http.build();
    }
}