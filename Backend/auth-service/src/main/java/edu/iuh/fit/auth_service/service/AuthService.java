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
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final UserRepository userRepository;
    private final UserSessionRepository sessionRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokenService;
    private final CookieUtil cookieUtil;
    private final S3Service s3Service;
    private final org.springframework.data.redis.core.StringRedisTemplate stringRedisTemplate;
    private final EmailService emailService;

    // Hằng số cho Brute-Force
    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final long LOCK_TIME_DURATION = 15; // 15 Phút

    @Value("${google.client-id:YOUR_GOOGLE_CLIENT_ID_HERE}")
    protected String GOOGLE_CLIENT_ID;
    
    @Transactional
    public void sendRegistrationOtp(String email) {
        if (userRepository.findByEmail(email).isPresent()) {
            throw new RuntimeException("Email đã được đăng ký");
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

        // Xóa Key khi đăng ký đúng để tránh bị dùng lại mã
        stringRedisTemplate.delete(redisKey);

        User user = User.builder()
                .id(UUID.randomUUID().toString())
                .email(request.email())
                .phoneNumber(request.phoneNumber())
                .password(passwordEncoder.encode(request.password()))
                .fullName(request.fullName())
                .authProvider(User.AuthProvider.LOCAL)
                .gender(2)
                .avatar("https://btl-alo-chat.s3.ap-southeast-1.amazonaws.com/user_avt.png")
                .coverImage("https://btl-alo-chat.s3.ap-southeast-1.amazonaws.com/default-cover-img.jpg")
                .build();
        userRepository.save(user);
    }

    // Trong AuthService.java

    public Map<String, String> login(LoginRequest request, HttpServletResponse response) {
        // request.email() ở đây có thể là email hoặc số điện thoại
        User user = userRepository.findByEmailOrPhoneNumber(request.email(), request.email())
                .orElseThrow(() -> new ResourceNotFoundException("Tài khoản không tồn tại"));

        String lockKey = "USER_LOCK:" + user.getId();
        String attemptsKey = "FAILED_ATTEMPTS:" + user.getId();

        // Kiểm tra xem User có đang trong thời gian phạt hay không
        if (Boolean.TRUE.equals(stringRedisTemplate.hasKey(lockKey))) {
            throw new UnauthorizedException("Tài khoản đang bị khóa tạm thời do sai quá nhiều lần. Vui lòng thử lại sau 15 phút.");
        }

        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            // Tăng số đếm
            Long attempts = stringRedisTemplate.opsForValue().increment(attemptsKey);
            if (attempts != null && attempts >= MAX_FAILED_ATTEMPTS) {
                // Đạt ngưỡng cửa cấm: Set khóa cờ 15 phút
                stringRedisTemplate.opsForValue().set(lockKey, "LOCKED", LOCK_TIME_DURATION, TimeUnit.MINUTES);
                stringRedisTemplate.delete(attemptsKey); // Đếm lại từ đầu sau khi hết khóa
                throw new UnauthorizedException("Bạn đã nhập sai 5 lần. Tài khoản bị khóa 15 phút bảo vệ.");
            }
            // Cho thời gian sống chu kỳ đếm sai là 1 Tiếng
            if (attempts != null && attempts == 1) {
                 stringRedisTemplate.expire(attemptsKey, 1, TimeUnit.HOURS);
            }
            throw new UnauthorizedException("Sai mật khẩu. Bạn còn " + (Math.max(0, MAX_FAILED_ATTEMPTS - (attempts != null ? attempts : 1))) + " lần thử.");
        }

        // Đăng nhập thành công -> Xóa hết tiền án tiền sự nhập sai
        stringRedisTemplate.delete(attemptsKey);

        String deviceId = (request.deviceId() == null) ? "unknown" : request.deviceId();

        // 1. Tạo Token
        String accessToken = tokenService.generateAccessToken(user);
        String refreshToken = tokenService.generateRefreshToken(user, deviceId);

        // Lấy Token ID từ JWT để lưu vào DB (Dùng để logout sau này)
        String tokenId = tokenService.getTokenIdFromJWT(refreshToken);

        // 2. Lưu Session vào MariaDB (Vì bạn đang ẩn Redis nên phải lưu vào DB để quản
        // lý)
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

        // Trả về cả 2 token (refreshToken cho Mobile lưu vào AsyncStorage)
        return Map.of("accessToken", accessToken, "refreshToken", refreshToken);
    }

    // 1. API: Lấy Profile (Dựa trên userId từ JWT)
    public User getProfile(String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User không tồn tại"));
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
                .orElseThrow(() -> new ResourceNotFoundException("Session không tồn tại"));

        if (!session.getUser().getId().equals(userId)) {
            throw new ForbiddenException("Bạn không có quyền!");
        }
        sessionRepository.delete(session);
    }

    /**
     * Dùng Refresh Token để cấp lại Access Token mới.
     * Kiểm tra Refresh Token còn hợp lệ và session còn tồn tại trong DB.
     */
    public String refreshAccessToken(String refreshToken) {
        // 1. Giải mã Refresh Token để lấy userId và tokenId
        String userId;
        String tokenId;
        try {
            userId = tokenService.getUserIdFromToken(refreshToken);
            tokenId = tokenService.getTokenIdFromJWT(refreshToken);
        } catch (Exception e) {
            throw new UnauthorizedException("Refresh Token không hợp lệ hoặc đã hết hạn");
        }

        // 2. Kiểm tra session trong DB (đảm bảo chưa bị logout từ xa)
        sessionRepository.findByRefreshTokenId(tokenId)
                .orElseThrow(() -> new UnauthorizedException("Phiên đăng nhập đã bị thu hồi"));

        // 3. Lấy User và cấp Access Token mới
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Tài khoản không tồn tại"));

        return tokenService.generateAccessToken(user);
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
                .orElseThrow(() -> new ResourceNotFoundException("Người dùng không tồn tại"));

        // Cập nhật các thông tin (chỉ cập nhật nếu request có dữ liệu)
        if (request.fullName() != null)
            user.setFullName(request.fullName());
        if (request.phoneNumber() != null)
            user.setPhoneNumber(request.phoneNumber());
        if (request.gender() != null)
            user.setGender(request.gender());
        if (request.dateOfBirth() != null)
            user.setDateOfBirth(request.dateOfBirth());
        if (request.email() != null && !request.email().isBlank())
            user.setEmail(request.email());

        return userRepository.save(user);
    }

    @Transactional
    public User updateAvatarOrCover(String userId, org.springframework.web.multipart.MultipartFile file,
            boolean isAvatar) throws java.io.IOException {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Người dùng không tồn tại"));

        // Lưu URL cũ để xóa sau khi upload mới thành công
        String oldUrl = isAvatar ? user.getAvatar() : user.getCoverImage();

        String fileUrl = s3Service.uploadFile(file);

        if (isAvatar) {
            user.setAvatar(fileUrl);
        } else {
            user.setCoverImage(fileUrl);
        }

        User updatedUser = userRepository.save(user);

        // Xóa ảnh cũ trên S3 nếu có
        if (oldUrl != null && oldUrl.startsWith("https://")) {
            // Chạy async hoặc try-catch để nếu lỗi xóa s3 cũng không làm gián đoạn Flow
            // chính
            try {
                s3Service.deleteFile(oldUrl);
            } catch (Exception e) {
                System.err.println("Không thể xóa ảnh cũ: " + oldUrl);
            }
        }

        return updatedUser;
    }

    public UserResponse searchByPhone(String phone) {
        User user = userRepository.findByPhoneNumber(phone)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng với số điện thoại này"));

        // Trả về DTO thay vì Entity User để bảo mật (không lộ password)
        return UserResponse.fromEntity(user);
    }

    // Để bên Contact Service có thể lấy thông tin hàng loạt bạn bè
    public List<UserResponse> getUsersByIds(List<String> ids) {
        return userRepository.findAllById(ids).stream()
                .map(UserResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional
    public void sendForgotPasswordOtp(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Email không tồn tại trong hệ thống"));

        SecureRandom random = new SecureRandom();
        String otp = String.format("%06d", random.nextInt(1000000));

        String redisKey = "OTP_FORGOT:" + email;
        stringRedisTemplate.opsForValue().set(redisKey, otp, 5, TimeUnit.MINUTES);

        String subject = "Mã xác thực Khôi phục mật khẩu ALO";
        String text = "Xin chào " + user.getFullName() + ",\n\n"
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

        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new ResourceNotFoundException("Tài khoản không tồn tại"));

        user.setPassword(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);

        // Xóa Key OTP
        stringRedisTemplate.delete(redisKey);
    }

    @Transactional
    public void changePassword(String userId, ChangePasswordRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Người dùng không tồn tại"));

        if (!passwordEncoder.matches(request.oldPassword(), user.getPassword())) {
            throw new RuntimeException("Mật khẩu hiện tại không chính xác");
        }

        user.setPassword(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);

        // Gửi email thông báo
        String subject = "Thông báo: Đổi mật khẩu thành công";
        String text = "Xin chào " + user.getFullName() + ",\n\n"
                + "Mật khẩu cho tài khoản ALO của bạn đã được thay đổi thành công.\n"
                + "Nếu bạn không thực hiện hành động này, vui lòng thực hiện Khôi phục mật khẩu ngay lập tức.\n\n"
                + "Trân trọng,\nĐội ngũ ALO";
        emailService.sendTextEmail(user.getEmail(), subject, text);
    }

    @Transactional
    public Map<String, String> loginWithGoogle(GoogleLoginRequest request, HttpServletResponse response) {
        try {
            // 1. Cấu hình máy quét Token chính chủ của Google
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), new GsonFactory())
                    .setAudience(Collections.singletonList(GOOGLE_CLIENT_ID))
                    .build();

            // 2. Kiểm tra token có chuẩn của Google không
            GoogleIdToken idToken = verifier.verify(request.idToken());
            if (idToken == null) {
                throw new UnauthorizedException("Token Google không hợp lệ hoặc đã hết hạn");
            }

            // 3. Lấy thông tin User từ Google
            GoogleIdToken.Payload payload = idToken.getPayload();
            String email = payload.getEmail();
            String name = (String) payload.get("name");
            String pictureUrl = (String) payload.get("picture");

            if (email == null) {
                throw new UnauthorizedException("Không thể lấy email từ tài khoản Google này");
            }

            // 4. Kiểm tra User có trong DB chưa
            User user = userRepository.findByEmail(email).orElse(null);

            if (user == null) {
                // NẾU CHƯA CÓ: Tự động tạo tài khoản mới
                user = User.builder()
                        .id(UUID.randomUUID().toString())
                        .email(email)
                        .fullName(name)
                        .avatar(pictureUrl)
                        .authProvider(User.AuthProvider.GOOGLE)
                        .password(passwordEncoder.encode(UUID.randomUUID().toString())) // Mật khẩu rác ngẫu nhiên
                        .gender(2) // Mặc định là 'Khác'
                        .build();
                user = userRepository.save(user);
            } else {
                // NẾU ĐÃ CÓ: Cập nhật lại provider nếu trước đó họ đăng ký tay (Account Linking)
                if (user.getAuthProvider() == null || user.getAuthProvider() == User.AuthProvider.LOCAL) {
                    user.setAuthProvider(User.AuthProvider.GOOGLE);
                    userRepository.save(user);
                }
            }

            // 5. Sinh JWT nội bộ & Quản lý Session (Giữ nguyên chuẩn của Alo-Full-Stack)
            String deviceId = (request.deviceId() == null) ? "Unknown Device" : request.deviceId();

            String accessToken = tokenService.generateAccessToken(user);
            String refreshToken = tokenService.generateRefreshToken(user, deviceId);
            String tokenId = tokenService.getTokenIdFromJWT(refreshToken);

            UserSession session = UserSession.builder()
                    .id(UUID.randomUUID().toString())
                    .user(user)
                    .deviceId(deviceId)
                    .refreshTokenId(tokenId)
                    .ipAddress("127.0.0.1") // Frontend có thể truyền thêm IP nếu cần
                    .expiresAt(LocalDateTime.now().plusDays(7))
                    .build();
            sessionRepository.save(session);

            // Set Cookie
            cookieUtil.createHttpOnlyCookie(response, "refreshToken", refreshToken, 604800);

            // 6. Nhả Token của hệ thống mình cho Frontend xài
            return Map.of("accessToken", accessToken, "refreshToken", refreshToken);

        } catch (Exception e) {
            throw new UnauthorizedException("Xác thực Google thất bại: " + e.getMessage());
        }
    }
}