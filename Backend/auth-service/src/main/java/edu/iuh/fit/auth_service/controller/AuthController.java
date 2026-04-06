package edu.iuh.fit.auth_service.controller;


import edu.iuh.fit.auth_service.dto.request.*;
import edu.iuh.fit.auth_service.dto.response.UserSessionResponse;
import edu.iuh.fit.auth_service.entity.User;
import edu.iuh.fit.auth_service.service.AuthService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;


@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor

//@CrossOrigin(origins = "*", allowedHeaders = "*")

public class AuthController {
    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        authService.register(request);
        return ResponseEntity.ok("Đăng ký thành công");
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request, HttpServletResponse response) {
        String accessToken = authService.login(request, response);
        return ResponseEntity.ok(Map.of("accessToken", accessToken));
    }
    // Lấy thông tin cá nhân (Yêu cầu Authorize JWT)
    @GetMapping("/me")
    public ResponseEntity<User> getMyProfile(@RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(authService.getProfile(userId));
    }

    // Lấy danh sách thiết bị đăng nhập
    @GetMapping("/sessions")
    public ResponseEntity<List<UserSessionResponse>> getMySessions(@RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(authService.getActiveSessions(userId));
    }

    // Đăng xuất từ xa
    @DeleteMapping("/sessions/{id}")
    public ResponseEntity<String> logoutFromDevice(@RequestHeader("X-User-Id") String userId, @PathVariable String id) {
        authService.terminateSession(userId, id);
        return ResponseEntity.ok("Đã đăng xuất thiết bị thành công");
    }

    // Đăng xuất hiện tại
    // Đăng xuất hiện tại
    @PostMapping("/logout")
    public ResponseEntity<String> logout(
            @CookieValue(name = "refreshToken", required = false) String refreshToken,
            jakarta.servlet.http.HttpServletResponse response) { // Thêm response ở đây

        if (refreshToken != null && !refreshToken.isBlank()) {
            try {
                // 1. Lấy TokenId từ chuỗi JWT refreshToken
                // (Giả sử bạn đã viết hàm này trong tokenService như mình hướng dẫn trước đó)
                String tokenId = authService.getTokenIdFromToken(refreshToken);

                // 2. Xóa session trong Database
                authService.logout(tokenId);

            } catch (Exception e) {
                // Nếu token lỗi hoặc hết hạn thì vẫn cho xóa cookie phía dưới
            }
        }

        // 3. QUAN TRỌNG: Gửi lệnh xóa Cookie về trình duyệt
        // Bạn phải dùng class CookieUtil đã sửa (có setPath("/"))
        authService.clearSessionCookie(response);

        return ResponseEntity.ok("Đăng xuất thành công");
    }

    // Cập nhật thông tin cá nhân
    @PutMapping("/me")
    public ResponseEntity<User> updateProfile(
            @RequestHeader("X-User-Id") String userId,
            @RequestBody UpdateProfileRequest request) {
        return ResponseEntity.ok(authService.updateProfile(userId, request));
    }
}
