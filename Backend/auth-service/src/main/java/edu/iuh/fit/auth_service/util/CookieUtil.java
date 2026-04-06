package edu.iuh.fit.auth_service.util;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

@Component
public class CookieUtil {

    // Hàm tạo Cookie
    public void createHttpOnlyCookie(HttpServletResponse response, String name, String value, int maxAge) {
        ResponseCookie cookie = ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(false) // localhost dùng HTTP nên để false
                .path("/")     // Đảm bảo dùng chung path root cho toàn app
                .maxAge(maxAge)
                .sameSite("Lax")
                .build();
        // Dùng setHeader thay vì addHeader để đảm bảo nếu có cookie trùng tên sẽ bị ghi đè hoàn toàn
        response.setHeader("Set-Cookie", cookie.toString());
    }

    // Hàm xóa Cookie (Phải giống hệt cấu hình hàm tạo)
    public void clearCookie(HttpServletResponse response, String name) {
        ResponseCookie cookie = ResponseCookie.from(name, "")
                .httpOnly(true)
                .secure(false)
                .path("/")
                .maxAge(0) // Thời gian sống bằng 0 để trình duyệt xóa ngay
                .sameSite("Lax")
                .build();
        response.setHeader("Set-Cookie", cookie.toString());
    }
}