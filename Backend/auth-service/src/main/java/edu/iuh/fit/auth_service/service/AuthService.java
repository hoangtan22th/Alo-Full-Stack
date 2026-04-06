package edu.iuh.fit.auth_service.service;



import edu.iuh.fit.auth_service.dto.request.*;
import edu.iuh.fit.auth_service.dto.response.UserSessionResponse;
import edu.iuh.fit.auth_service.entity.*;
import edu.iuh.fit.auth_service.repository.*;
import edu.iuh.fit.auth_service.util.CookieUtil;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final UserRepository userRepository;
    private final UserSessionRepository sessionRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokenService;
    private final CookieUtil cookieUtil;

    @Transactional
    public void register(RegisterRequest request) {
        User user = User.builder()
                .id(UUID.randomUUID().toString())
                .email(request.email())
                .password(passwordEncoder.encode(request.password()))
                .fullName(request.fullName())
                .authProvider(User.AuthProvider.LOCAL)
                .gender(2)
                .build();
        userRepository.save(user);
    }

    // Trong AuthService.java

    public String login(LoginRequest request, HttpServletResponse response) {
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new RuntimeException("Email không tồn tại"));

        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new RuntimeException("Sai mật khẩu");
        }

        String deviceId = (request.deviceId() == null) ? "unknown" : request.deviceId();

        // 1. Tạo Token
        String accessToken = tokenService.generateAccessToken(user);
        String refreshToken = tokenService.generateRefreshToken(user, deviceId);

        // Lấy Token ID từ JWT để lưu vào DB (Dùng để logout sau này)
        String tokenId = tokenService.getTokenIdFromJWT(refreshToken);

        // 2. Lưu Session vào MariaDB (Vì bạn đang ẩn Redis nên phải lưu vào DB để quản lý)
        UserSession session = UserSession.builder()
                .id(UUID.randomUUID().toString())
                .user(user)
                .deviceId(deviceId)
                .refreshTokenId(tokenId)
                .ipAddress("127.0.0.1") // Có thể lấy từ request thực tế
                .expiresAt(LocalDateTime.now().plusDays(7))
                .build();
        sessionRepository.save(session);

        // 3. Set Cookie
        cookieUtil.createHttpOnlyCookie(response, "refreshToken", refreshToken, 604800);

        return accessToken;
    }

    // 1. API: Lấy Profile (Dựa trên userId từ JWT)
    public User getProfile(String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User không tồn tại"));
    }

    // 2. API: Logout (Xóa phiên đăng nhập hiện tại)
    @Transactional
    public void logout(String refreshTokenId) {
        sessionRepository.deleteByRefreshTokenId(refreshTokenId);
        // Lưu ý: Nếu sau này bạn mở lại Redis, hãy xóa key trong Redis ở đây luôn.
    }

    // 3. API: Lấy danh sách thiết bị đang đăng nhập
    public List<UserSessionResponse> getActiveSessions(String userId) {
        return sessionRepository.findByUserId(userId).stream()
                .map(s -> new UserSessionResponse(s.getId(), s.getDeviceId(), s.getIpAddress(), s.getCreatedAt()))
                .collect(Collectors.toList());
    }

    // 4. API: Đăng xuất từ xa (Xóa session theo ID)
    @Transactional
    public void terminateSession(String userId, String sessionId) {
        UserSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session không tồn tại"));

        if (!session.getUser().getId().equals(userId)) {
            throw new RuntimeException("Bạn không có quyền!");
        }
        sessionRepository.delete(session);
    }
    public String getTokenIdFromToken(String token) {
        return tokenService.getTokenIdFromJWT(token);
    }

    public void clearSessionCookie(HttpServletResponse response) {
        // Gọi đến CookieUtil của bạn
        cookieUtil.clearCookie(response, "refreshToken");
    }

    @Transactional
    public User updateProfile(String userId, UpdateProfileRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Người dùng không tồn tại"));

        // Cập nhật các thông tin (chỉ cập nhật nếu request có dữ liệu)
        if (request.fullName() != null) user.setFullName(request.fullName());
        if (request.phoneNumber() != null) user.setPhoneNumber(request.phoneNumber());
        if (request.gender() != null) user.setGender(request.gender());
        if (request.dateOfBirth() != null) user.setDateOfBirth(request.dateOfBirth());

        return userRepository.save(user);
    }
}