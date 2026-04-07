package edu.iuh.fit.auth_service.controller;

import edu.iuh.fit.common_service.dto.response.ApiResponse;
import edu.iuh.fit.auth_service.dto.request.*;
import edu.iuh.fit.auth_service.dto.request.RegistrationOtpRequest;
import edu.iuh.fit.auth_service.dto.response.UserResponse;
import edu.iuh.fit.auth_service.dto.response.UserSessionResponse;
import edu.iuh.fit.auth_service.service.AuthService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor

// @CrossOrigin(origins = "*", allowedHeaders = "*")

public class AuthController {
    private final AuthService authService;

    @PostMapping("/send-otp")
    public ResponseEntity<ApiResponse<String>> sendOtp(@Valid @RequestBody RegistrationOtpRequest request) {
        authService.sendRegistrationOtp(request.email(), request.phoneNumber());
        return ResponseEntity.ok(ApiResponse.success("Mã xác nhận đã được gửi đến email của bạn"));
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<String>> register(@Valid @RequestBody RegisterRequest request) {
        authService.register(request);
        return ResponseEntity.ok(ApiResponse.success("Đăng ký thành công"));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<Map<String, String>>> login(@RequestBody LoginRequest request,
            HttpServletResponse response) {
        Map<String, String> tokens = authService.login(request, response);
        return ResponseEntity.ok(ApiResponse.success(tokens));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<Map<String, String>>> refreshToken(
            @CookieValue(name = "refreshToken", required = false) String cookieRefreshToken,
            @RequestBody(required = false) Map<String, String> body) {
        // Ưu tiên lấy từ Cookie, nếu không có thì lấy từ body (cho Mobile)
        String refreshToken = cookieRefreshToken;
        if (refreshToken == null && body != null) {
            refreshToken = body.get("refreshToken");
        }
        if (refreshToken == null || refreshToken.isBlank()) {
            return ResponseEntity.status(401).body(ApiResponse.error(401, "Không tìm thấy Refresh Token"));
        }
        String newAccessToken = authService.refreshAccessToken(refreshToken);
        return ResponseEntity.ok(ApiResponse.success(Map.of("accessToken", newAccessToken)));
    }

    @PostMapping("/forgot-password/send-otp")
    public ResponseEntity<ApiResponse<String>> sendForgotPasswordOtp(@Valid @RequestBody SendOtpRequest request) {
        authService.sendForgotPasswordOtp(request.email());
        return ResponseEntity.ok(ApiResponse.success("Mã khôi phục đã được gửi đến email của bạn"));
    }

    @PostMapping("/forgot-password/reset")
    public ResponseEntity<ApiResponse<String>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.ok(ApiResponse.success("Mật khẩu đã được đặt lại thành công"));
    }

    @PostMapping("/change-password")
    public ResponseEntity<ApiResponse<String>> changePassword(@RequestHeader("X-User-Id") String userId, @Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(userId, request);
        return ResponseEntity.ok(ApiResponse.success("Đổi mật khẩu thành công"));
    }

    // Lấy thông tin cá nhân (Yêu cầu Authorize JWT)
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> getMyProfile(@RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(ApiResponse.success(UserResponse.fromEntity(authService.getProfile(userId))));
    }

    // Lấy danh sách thiết bị đăng nhập
    @GetMapping("/sessions")
    public ResponseEntity<ApiResponse<List<UserSessionResponse>>> getMySessions(
            @RequestHeader("X-User-Id") String userId,
            @RequestHeader(value = "X-Session-Id", required = false) String currentSessionId) {
        return ResponseEntity.ok(ApiResponse.success(authService.getActiveSessions(userId, currentSessionId)));
    }

    // Đăng xuất từ xa
    @DeleteMapping("/sessions/{id}")
    public ResponseEntity<ApiResponse<String>> logoutFromDevice(@RequestHeader("X-User-Id") String userId,
            @PathVariable String id) {
        authService.terminateSession(userId, id);
        return ResponseEntity.ok(ApiResponse.success("Đã đăng xuất thiết bị thành công"));
    }

    // Đăng xuất tất cả thiết bị KHÁC thiết bị hiện tại
    @DeleteMapping("/sessions/others")
    public ResponseEntity<ApiResponse<String>> logoutAllOtherDevices(
            @RequestHeader("X-User-Id") String userId,
            @RequestHeader("X-Session-Id") String currentSessionId) {
        authService.terminateAllOtherSessions(userId, currentSessionId);
        return ResponseEntity.ok(ApiResponse.success("Đã đăng xuất tất cả các thiết bị khác"));
    }

    // Đăng xuất hiện tại
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<String>> logout(
            @CookieValue(name = "refreshToken", required = false) String refreshToken,
            jakarta.servlet.http.HttpServletResponse response) {

        if (refreshToken != null && !refreshToken.isBlank()) {
            try {
                String tokenId = authService.getTokenIdFromToken(refreshToken);
                authService.logout(tokenId);
            } catch (Exception e) {
            }
        }
        authService.clearSessionCookie(response);
        return ResponseEntity.ok(ApiResponse.success("Đăng xuất thành công"));
    }

    // Cập nhật thông tin cá nhân
    @PutMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> updateProfile(
            @RequestHeader("X-User-Id") String userId,
            @Valid @RequestBody UpdateProfileRequest request) {
        return ResponseEntity
                .ok(ApiResponse.success(UserResponse.fromEntity(authService.updateProfile(userId, request))));
    }

    // Cập nhật Avatar ảnh đại diện
    @PostMapping(value = "/me/avatar", consumes = "multipart/form-data")
    public ResponseEntity<ApiResponse<UserResponse>> updateAvatar(
            @RequestHeader("X-User-Id") String userId,
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file) throws java.io.IOException {
        return ResponseEntity
                .ok(ApiResponse.success(UserResponse.fromEntity(authService.updateAvatarOrCover(userId, file, true))));
    }

    // Cập nhật ảnh bìa
    @PostMapping(value = "/me/cover", consumes = "multipart/form-data")
    public ResponseEntity<ApiResponse<UserResponse>> updateCover(
            @RequestHeader("X-User-Id") String userId,
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file) throws java.io.IOException {
        return ResponseEntity
                .ok(ApiResponse.success(UserResponse.fromEntity(authService.updateAvatarOrCover(userId, file, false))));
    }

    // API: Tìm kiếm người dùng theo số điện thoại (Dùng cho Modal Thêm Bạn)
    @GetMapping("/search")
    public ResponseEntity<ApiResponse<UserResponse>> searchUser(@RequestParam String phone) {
        return ResponseEntity.ok(ApiResponse.success(authService.searchByPhone(phone)));
    }

    // API: Lấy danh sách thông tin User theo List ID (Dùng để hiển thị tên/avatar
    // trong danh sách bạn bè)
    @PostMapping("/users/by-ids")
    public ResponseEntity<ApiResponse<List<UserResponse>>> getUsersByIds(@RequestBody List<String> ids) {
        return ResponseEntity.ok(ApiResponse.success(authService.getUsersByIds(ids)));
    }
}
