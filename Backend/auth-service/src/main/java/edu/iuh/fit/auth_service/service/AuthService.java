package edu.iuh.fit.auth_service.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import edu.iuh.fit.auth_service.dto.request.*;
import edu.iuh.fit.auth_service.dto.response.UserResponse;
import edu.iuh.fit.auth_service.dto.response.UserSessionResponse;
import edu.iuh.fit.auth_service.entity.*;
import edu.iuh.fit.auth_service.repository.*;
import edu.iuh.fit.auth_service.util.CookieUtil;
import edu.iuh.fit.common_service.exception.AppException;
import edu.iuh.fit.common_service.exception.ForbiddenException;
import edu.iuh.fit.common_service.exception.ResourceNotFoundException;
import edu.iuh.fit.common_service.exception.UnauthorizedException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AccountRepository accountRepository;
    private final UserSessionRepository sessionRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokenService;
    private final CookieUtil cookieUtil;
    private final org.springframework.data.redis.core.StringRedisTemplate stringRedisTemplate;
    private final EmailService emailService;
    private final RabbitMQPublisher rabbitMQPublisher;
    private final RoleRepository roleRepository;

    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final long LOCK_TIME_DURATION = 15;

    @Value("${google.client-id:YOUR_GOOGLE_CLIENT_ID_HERE}")
    protected String GOOGLE_CLIENT_ID;

    @Transactional
    public void sendRegistrationOtp(String email, String phoneNumber) {
        if (accountRepository.findByEmail(email).isPresent()) {
            throw new edu.iuh.fit.common_service.exception.DuplicateResourceException("Email đã được đăng ký");
        }
        if (accountRepository.existsByPhoneNumber(phoneNumber)) {
            throw new edu.iuh.fit.common_service.exception.DuplicateResourceException("Số điện thoại đã được đăng ký bởi tài khoản khác");
        }

        SecureRandom random = new SecureRandom();
        String otp = String.format("%06d", random.nextInt(1000000));
        String redisKey = "OTP_REG:" + email;
        stringRedisTemplate.opsForValue().set(redisKey, otp, 5, TimeUnit.MINUTES);

        String subject = "Mã xác nhận đăng ký tài khoản ALO";
        String text = "Xin chào,\n\nMã OTP xác nhận đăng ký tài khoản của bạn là: " + otp + "\nMã này sẽ hết hạn trong vòng 5 phút.\n\nTrân trọng,\nĐội ngũ ALO";
        emailService.sendTextEmail(email, subject, text);
    }

    @Transactional
    public void register(RegisterRequest request) {
        String redisKey = "OTP_REG:" + request.email();
        String savedOtp = stringRedisTemplate.opsForValue().get(redisKey);

        if (savedOtp == null) {
            throw new RuntimeException("Mã OTP đã hết hạn hoặc chưa được yêu cầu");
        }
        if (!savedOtp.equals(request.otp())) {
            throw new RuntimeException("Mã OTP không chính xác");
        }

        if (accountRepository.existsByPhoneNumber(request.phoneNumber())) {
            throw new edu.iuh.fit.common_service.exception.DuplicateResourceException("Số điện thoại đã được đăng ký bởi tài khoản khác");
        }

        stringRedisTemplate.delete(redisKey);

        Set<Role> roles = new HashSet<>();
        roleRepository.findByName("ROLE_USER").ifPresent(roles::add);

        Account user = Account.builder()
                .id(UUID.randomUUID().toString())
                .email(request.email())
                .phoneNumber(request.phoneNumber())
                // Only auth fields
                .password(passwordEncoder.encode(request.password()))
                .authProvider(Account.AuthProvider.LOCAL)
                .status(AccountStatus.ACTIVE)
                .roles(roles)
                .build();
        accountRepository.save(user);

        // Send RabbitMQ event to User Service so it can build UserProfile
        rabbitMQPublisher.publishUserRegisteredEvent(
                user.getId(),
                user.getEmail(),
                request.fullName(),
                user.getPhoneNumber(),
                "https://btl-alo-chat.s3.ap-southeast-1.amazonaws.com/alo_user_images/user_avt.png",
                "https://btl-alo-chat.s3.ap-southeast-1.amazonaws.com/alo_cover_images/default-cover-img.jpg",
                2);
    }

    @Transactional
    public Map<String, String> login(LoginRequest request, HttpServletRequest httpRequest, HttpServletResponse response) {
        Account user = accountRepository.findByEmailOrPhoneNumber(request.email(), request.email())
                .orElseThrow(() -> new ResourceNotFoundException("Tài khoản không tồn tại"));

        String lockKey = "USER_LOCK:" + user.getId();
        String attemptsKey = "FAILED_ATTEMPTS:" + user.getId();

        if (Boolean.TRUE.equals(stringRedisTemplate.hasKey(lockKey))) {
            throw new UnauthorizedException("Tài khoản đang bị khóa tạm thời. Vui lòng thử lại sau 15 phút.");
        }

        if (user.getStatus() == AccountStatus.BANNED) {
            throw new UnauthorizedException("Tài khoản này đã bị cấm khỏi hệ thống.");
        }

        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            Long attempts = stringRedisTemplate.opsForValue().increment(attemptsKey);

            // Also store failed attempts in DB
            user.setFailedLoginAttempts((user.getFailedLoginAttempts() != null ? user.getFailedLoginAttempts() : 0) + 1);

            if (attempts != null && attempts >= MAX_FAILED_ATTEMPTS) {
                stringRedisTemplate.opsForValue().set(lockKey, "LOCKED", LOCK_TIME_DURATION, TimeUnit.MINUTES);
                stringRedisTemplate.delete(attemptsKey);

                user.setStatus(AccountStatus.SUSPENDED);
                user.setLockoutEnd(LocalDateTime.now().plusMinutes(LOCK_TIME_DURATION));
                accountRepository.save(user);

                throw new UnauthorizedException("Bạn đã nhập sai 5 lần. Tài khoản bị khóa 15 phút bảo vệ.");
            }
            if (attempts != null && attempts == 1) {
                stringRedisTemplate.expire(attemptsKey, 1, TimeUnit.HOURS);
            }
            accountRepository.save(user);
            throw new UnauthorizedException("Sai mật khẩu. Bạn còn " + (Math.max(0, MAX_FAILED_ATTEMPTS - (attempts != null ? attempts : 1))) + " lần thử.");
        }

        // Đăng nhập thành công -> Xóa attempts
        stringRedisTemplate.delete(attemptsKey);
        user.setFailedLoginAttempts(0);
        user.setStatus(AccountStatus.ACTIVE);
        user.setLockoutEnd(null);
        accountRepository.save(user);

        String deviceId = (request.deviceId() == null) ? "unknown" : request.deviceId();
        String sessionId = UUID.randomUUID().toString();

        String accessToken = tokenService.generateAccessToken(user, sessionId);
        String refreshToken = tokenService.generateRefreshToken(user, deviceId);
        String tokenId = tokenService.getTokenIdFromJWT(refreshToken);

        // Đổ toàn bộ session cũ vào blacklist và xóa khỏi DB chặn dùng nhiều máy
        invalidateOldSessions(user.getId(), sessionId, deviceId);

        String ipAddress = getClientIpString(httpRequest);

        UserSession session = UserSession.builder()
                .id(sessionId)
                .account(user)
                .deviceId(deviceId)
                .refreshTokenId(tokenId)
                .ipAddress(ipAddress)
                .expiresAt(LocalDateTime.now().plusDays(7))
                .build();
        sessionRepository.save(session);
        cookieUtil.createHttpOnlyCookie(response, "refreshToken", refreshToken, 604800);

        return Map.of("accessToken", accessToken, "refreshToken", refreshToken);
    }

    @Transactional
    public Map<String, String> adminLogin(LoginRequest request, HttpServletRequest httpRequest, HttpServletResponse response) {
        Account user = accountRepository.findByEmailOrPhoneNumber(request.email(), request.email())
                .orElseThrow(() -> new ResourceNotFoundException("Tài khoản không tồn tại"));

        // SECURITY CHECK: Verify if the user has ADMIN or SUPER_ADMIN roles
        boolean isAdmin = user.getRoles().stream()
                .anyMatch(role -> role.getName().equals("ROLE_ADMIN") || role.getName().equals("ROLE_SUPER_ADMIN"));

        if (!isAdmin) {
            throw new ForbiddenException("Bạn không có quyền truy cập trang quản trị.");
        }

        String lockKey = "USER_LOCK:" + user.getId();
        String attemptsKey = "FAILED_ATTEMPTS:" + user.getId();

        if (Boolean.TRUE.equals(stringRedisTemplate.hasKey(lockKey))) {
            throw new UnauthorizedException("Tài khoản đang bị khóa tạm thời hệ thống.");
        }

        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            Long attempts = stringRedisTemplate.opsForValue().increment(attemptsKey);
            user.setFailedLoginAttempts((user.getFailedLoginAttempts() != null ? user.getFailedLoginAttempts() : 0) + 1);

            if (attempts != null && attempts >= MAX_FAILED_ATTEMPTS) {
                stringRedisTemplate.opsForValue().set(lockKey, "LOCKED", LOCK_TIME_DURATION, TimeUnit.MINUTES);
                stringRedisTemplate.delete(attemptsKey);
                user.setStatus(AccountStatus.SUSPENDED);
                user.setLockoutEnd(LocalDateTime.now().plusMinutes(LOCK_TIME_DURATION));
                accountRepository.save(user);
                throw new UnauthorizedException("Bạn đã nhập sai 5 lần. Tài khoản bị khóa 15 phút bảo vệ.");
            }
            if (attempts != null && attempts == 1) {
                stringRedisTemplate.expire(attemptsKey, 1, TimeUnit.HOURS);
            }
            accountRepository.save(user);
            throw new UnauthorizedException("Sai mật khẩu. Bạn còn " + (Math.max(0, MAX_FAILED_ATTEMPTS - (attempts != null ? attempts : 1))) + " lần thử.");
        }

        stringRedisTemplate.delete(attemptsKey);
        user.setFailedLoginAttempts(0);
        user.setStatus(AccountStatus.ACTIVE);
        user.setLockoutEnd(null);
        accountRepository.save(user);

        String deviceId = (request.deviceId() == null) ? "unknown" : request.deviceId();
        String sessionId = UUID.randomUUID().toString();

        String accessToken = tokenService.generateAccessToken(user, sessionId);
        String refreshToken = tokenService.generateRefreshToken(user, deviceId);
        String tokenId = tokenService.getTokenIdFromJWT(refreshToken);

        invalidateOldSessions(user.getId(), sessionId, deviceId);

        String ipAddress = getClientIpString(httpRequest);

        UserSession session = UserSession.builder()
                .id(sessionId)
                .account(user)
                .deviceId(deviceId)
                .refreshTokenId(tokenId)
                .ipAddress(ipAddress)
                .expiresAt(LocalDateTime.now().plusDays(7))
                .build();
        sessionRepository.save(session);
        cookieUtil.createHttpOnlyCookie(response, "refreshToken", refreshToken, 604800);

        return Map.of("accessToken", accessToken, "refreshToken", refreshToken);
    }

    // 1. Dùng DTO fallback cho Profile vì thông tin này hằng ngày nằm trên User Service.
    public UserResponse getProfile(String userId) {
        Account acc = accountRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User không tồn tại"));
        return UserResponse.fromEntity(acc); // Sẽ chỉ xuất những gì auth-service có.
    }

    @Transactional
    public void logout(String refreshTokenId) {
        sessionRepository.findByRefreshTokenId(refreshTokenId).ifPresent(session -> {
            stringRedisTemplate.opsForValue().set("BLACKLIST_SESSION:" + session.getId(), "KICKED", 15, TimeUnit.MINUTES);
            sessionRepository.delete(session);
        });
    }

    public List<UserSessionResponse> getActiveSessions(String userId, String currentSessionId) {
        return sessionRepository.findByAccountId(userId).stream() // Lưu ý cần đổi hàm repo
                .map(s -> new UserSessionResponse(s.getId(), s.getDeviceId(), s.getIpAddress(), s.getCreatedAt(), s.getId().equals(currentSessionId)))
                .collect(Collectors.toList());
    }

    @Transactional
    public void terminateSession(String userId, String sessionId) {
        UserSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session không tồn tại"));

        if (!session.getAccount().getId().equals(userId)) {
            throw new ForbiddenException("Bạn không có quyền!");
        }
        stringRedisTemplate.opsForValue().set("BLACKLIST_SESSION:" + sessionId, "KICKED", 15, TimeUnit.MINUTES);
        sessionRepository.delete(session);
    }

    @Transactional
    public void terminateAllOtherSessions(String userId, String currentSessionId) {
        List<UserSession> allSessions = sessionRepository.findByAccountId(userId);
        for (UserSession session : allSessions) {
            if (!session.getId().equals(currentSessionId)) {
                stringRedisTemplate.opsForValue().set("BLACKLIST_SESSION:" + session.getId(), "KICKED", 15, TimeUnit.MINUTES);
                sessionRepository.delete(session);
            }
        }
    }

    public String refreshAccessToken(String refreshToken) {
        String userId;
        String tokenId;
        try {
            userId = tokenService.getUserIdFromToken(refreshToken);
            tokenId = tokenService.getTokenIdFromJWT(refreshToken);
        } catch (Exception e) {
            throw new UnauthorizedException("Refresh Token không hợp lệ hoặc đã hết hạn");
        }

        UserSession session = sessionRepository.findByRefreshTokenId(tokenId)
                .orElseThrow(() -> new UnauthorizedException("Phiên đăng nhập đã bị thu hồi"));

        Account user = accountRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Tài khoản không tồn tại"));

        return tokenService.generateAccessToken(user, session.getId());
    }

    public String getTokenIdFromToken(String token) {
        return tokenService.getTokenIdFromJWT(token);
    }

    public void clearSessionCookie(HttpServletResponse response) {
        cookieUtil.clearCookie(response, "refreshToken");
    }

    public UserResponse searchByPhone(String phone) {
        Account user = accountRepository.findByPhoneNumber(phone)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng với số điện thoại này"));
        return UserResponse.fromEntity(user);
    }

    public List<UserResponse> getUsersByIds(List<String> ids) {
        return accountRepository.findAllById(ids).stream()
                .map(UserResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional
    public void sendForgotPasswordOtp(String email) {
        Account user = accountRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Email không tồn tại trong hệ thống"));

        SecureRandom random = new SecureRandom();
        String otp = String.format("%06d", random.nextInt(1000000));
        String redisKey = "OTP_FORGOT:" + email;
        stringRedisTemplate.opsForValue().set(redisKey, otp, 5, TimeUnit.MINUTES);

        String subject = "Mã xác thực Khôi phục mật khẩu ALO";
        String text = "Xin chào,\n\n"
                + "Bạn đã yêu cầu đặt lại mật khẩu. Mã OTP của bạn là: " + otp + "\n"
                + "Mã này sẽ hết hạn trong vòng 5 phút.\n\n"
                + "Nếu bạn không thực hiện yêu cầu này, vui lòng đổi mật khẩu càng sớm càng tốt để bảo vệ tài khoản.\n\n"
                + "Trân trọng,\nĐội ngũ ALO";
        emailService.sendTextEmail(email, subject, text);
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        String redisKey = "OTP_FORGOT:" + request.email();
        String savedOtp = stringRedisTemplate.opsForValue().get(redisKey);

        if (savedOtp == null) {
            throw new RuntimeException("Mã OTP đã hết hạn hoặc chưa được yêu cầu");
        }
        if (!savedOtp.equals(request.otp())) {
            throw new RuntimeException("Mã OTP không chính xác");
        }

        Account user = accountRepository.findByEmail(request.email())
                .orElseThrow(() -> new ResourceNotFoundException("Tài khoản không tồn tại"));

        user.setPassword(passwordEncoder.encode(request.newPassword()));
        accountRepository.save(user);
        stringRedisTemplate.delete(redisKey);
    }

    @Transactional
    public void changePassword(String userId, ChangePasswordRequest request) {
        Account user = accountRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Người dùng không tồn tại"));

        if (!passwordEncoder.matches(request.oldPassword(), user.getPassword())) {
            throw new RuntimeException("Mật khẩu hiện tại không chính xác");
        }

        user.setPassword(passwordEncoder.encode(request.newPassword()));
        accountRepository.save(user);

        String subject = "Thông báo: Đổi mật khẩu thành công";
        String text = "Xin chào,\n\n"
                + "Mật khẩu cho tài khoản ALO của bạn đã được thay đổi thành công.\n"
                + "Nếu bạn không thực hiện hành động này, vui lòng thực hiện Khôi phục mật khẩu ngay lập tức.\n\n"
                + "Trân trọng,\nĐội ngũ ALO";
        emailService.sendTextEmail(user.getEmail(), subject, text);
    }

    @Transactional
    public Map<String, String> loginWithGoogle(GoogleLoginRequest request, HttpServletRequest httpRequest, HttpServletResponse response) {
        try {
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), new GsonFactory())
                    .setAudience(Collections.singletonList(GOOGLE_CLIENT_ID))
                    .build();

            GoogleIdToken idToken = verifier.verify(request.idToken());
            if (idToken == null) {
                throw new UnauthorizedException("Token Google không hợp lệ hoặc đã hết hạn");
            }

            GoogleIdToken.Payload payload = idToken.getPayload();
            String email = payload.getEmail();
            String name = (String) payload.get("name");
            String pictureUrl = (String) payload.get("picture");

            if (email == null) {
                throw new UnauthorizedException("Không thể lấy email từ tài khoản Google này");
            }

            Account user = accountRepository.findByEmail(email).orElse(null);

            if (user != null && user.getStatus() == AccountStatus.BANNED) {
                throw new UnauthorizedException("Tài khoản này đã bị cấm khỏi hệ thống.");
            }

            if (user == null) {
                Set<Role> roles = new HashSet<>();
                roleRepository.findByName("ROLE_USER").ifPresent(roles::add);

                user = Account.builder()
                        .id(UUID.randomUUID().toString())
                        .email(email)
                        .authProvider(Account.AuthProvider.GOOGLE)
                        .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                        .providerId(payload.getSubject())
                        .status(AccountStatus.ACTIVE)
                        .roles(roles)
                        .build();
                user = accountRepository.save(user);

                rabbitMQPublisher.publishUserRegisteredEvent(user.getId(), email, name, null, pictureUrl, "https://btl-alo-chat.s3.ap-southeast-1.amazonaws.com/alo_cover_images/default-cover-img.jpg", 2);
            } else {
                if (user.getAuthProvider() == null || user.getAuthProvider() == Account.AuthProvider.LOCAL) {
                    user.setAuthProvider(Account.AuthProvider.GOOGLE);
                    user.setProviderId(payload.getSubject());
                    accountRepository.save(user);
                }
            }

            String deviceId = (request.deviceId() == null) ? "Unknown Device" : request.deviceId();
            String sessionId = UUID.randomUUID().toString();

            String accessToken = tokenService.generateAccessToken(user, sessionId);
            String refreshToken = tokenService.generateRefreshToken(user, deviceId);
            String tokenId = tokenService.getTokenIdFromJWT(refreshToken);

            invalidateOldSessions(user.getId(), sessionId, deviceId);

            String ipAddress = getClientIpString(httpRequest);

            UserSession session = UserSession.builder()
                    .id(sessionId)
                    .account(user)
                    .deviceId(deviceId)
                    .refreshTokenId(tokenId)
                    .ipAddress(ipAddress)
                    .expiresAt(LocalDateTime.now().plusDays(7))
                    .build();
            sessionRepository.save(session);
            cookieUtil.createHttpOnlyCookie(response, "refreshToken", refreshToken, 604800);

            return Map.of("accessToken", accessToken, "refreshToken", refreshToken);

        } catch (Exception e) {
            throw new UnauthorizedException("Xác thực Google thất bại: " + e.getMessage());
        }
    }

    @Transactional
    public void invalidateOldSessions(String accountId, String keepSessionId, String deviceId) {
        boolean isWebLogin = deviceId != null && deviceId.toLowerCase().contains("web");
        List<UserSession> oldSessions = sessionRepository.findByAccountId(accountId);

        List<UserSession> sessionsToKill = oldSessions.stream()
                .filter(s -> !s.getId().equals(keepSessionId)) // Bảo hiểm không kick session hiện hành
                .filter(s -> {
                    boolean isOldWeb = s.getDeviceId() != null && s.getDeviceId().toLowerCase().contains("web");
                    return isWebLogin == isOldWeb; // Web kills Web, Mobile kills Mobile
                })
                .toList();

        List<String> killedSessionIds = new java.util.ArrayList<>();
        for (UserSession s : sessionsToKill) {
            killedSessionIds.add(s.getId());
            String blacklistKey = "BLACKLIST_SESSION:" + s.getId();
            stringRedisTemplate.opsForValue().set(blacklistKey, "true", 15, TimeUnit.MINUTES);
        }

        if (!sessionsToKill.isEmpty()) {
            sessionRepository.deleteAll(sessionsToKill);
            rabbitMQPublisher.publishForceLogoutEvent(accountId, killedSessionIds, "Tài khoản của bạn đã được đăng nhập ở một thiết bị khác");
        }
    }

    private String getClientIpString(HttpServletRequest request) {
        String ipAddress = request.getHeader("X-Forwarded-For");
        if (ipAddress == null || ipAddress.isEmpty() || "unknown".equalsIgnoreCase(ipAddress)) {
            ipAddress = request.getRemoteAddr();
        }

        // In case of multiple IPs, take the first one
        if (ipAddress != null && ipAddress.indexOf(',') > 0) {
            ipAddress = ipAddress.substring(0, ipAddress.indexOf(',')).trim();
        }
        return ipAddress;
    }
}
