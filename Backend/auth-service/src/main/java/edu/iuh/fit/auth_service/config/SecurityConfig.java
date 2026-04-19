package edu.iuh.fit.auth_service.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final InternalHeaderAuthenticationFilter headerAuthFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http.csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth
                        // 1. Các endpoint công khai (Login/Register/Swagger)
                        .requestMatchers(
                                "/v3/api-docs/**",
                                "/swagger-ui/**",
                                "/swagger-ui.html",
                                "/api/v1/auth/login",
                                "/api/v1/auth/send-otp",
                                "/api/v1/auth/register",
                                "/api/v1/auth/refresh",
                                "/api/v1/auth/google",
                                "/api/v1/auth/qr/generate",
                                "/api/v1/auth/qr/status/**",
                                "/api/v1/auth/forgot-password/**",
                                "/api/v1/chatbot/**"
                        ).permitAll()
                        .requestMatchers("/api/v1/admin/auth/login").permitAll()

                        // 2. Với Microservices, ta không tin tưởng hoàn toàn mọi request.
                        // Yêu cầu xác thực với các endpoint khác.
                        .anyRequest().authenticated()
                )
                
                // 3. Thêm Filter khôi phục SecurityContext từ Header của Gateway
                .addFilterBefore(headerAuthFilter, UsernamePasswordAuthenticationFilter.class)

                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                );

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}