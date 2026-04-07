package edu.iuh.fit.auth_service.service;

import edu.iuh.fit.auth_service.dto.request.QrVerifyRequest;
import edu.iuh.fit.auth_service.dto.response.QrSessionResponse;
import edu.iuh.fit.auth_service.entity.QrSession;
import edu.iuh.fit.auth_service.entity.User;
import edu.iuh.fit.auth_service.entity.UserSession;
import edu.iuh.fit.auth_service.enums.QrAuthStatus;
import edu.iuh.fit.auth_service.repository.QrSessionRepository;
import edu.iuh.fit.auth_service.repository.UserRepository;
import edu.iuh.fit.auth_service.repository.UserSessionRepository;
import edu.iuh.fit.auth_service.util.CookieUtil;
import edu.iuh.fit.common_service.exception.AppException;
import edu.iuh.fit.common_service.exception.ResourceNotFoundException;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class QrAuthService {

    private final TokenService tokenService;
    private final UserRepository userRepository;
    private final UserSessionRepository sessionRepository;
    private final QrSessionRepository qrSessionRepository;
    private final CookieUtil cookieUtil;

    private static final long QR_TTL_MINUTES = 3; // Mã QR có hiệu lực 3 phút

    /**
     * 1. Web gọi để tạo QR token mới. Status ban đầu là PENDING.
     */
    public QrSessionResponse generateQrToken() {
        String qrToken = UUID.randomUUID().toString();
        
        // Lưu vào Redis với TTL
        QrSession qrSession = QrSession.builder()
                .qrToken(qrToken)
                .status(QrAuthStatus.PENDING)
                .createdAt(LocalDateTime.now())
                .expiresAt(LocalDateTime.now().plusMinutes(QR_TTL_MINUTES))
                .timeToLive(QR_TTL_MINUTES * 60) // TTL tính bằng giây
                .build();
        qrSessionRepository.save(qrSession);

        return QrSessionResponse.builder()
                .qrToken(qrToken)
                .status(QrAuthStatus.PENDING)
                .build();
    }

    /**
     * 2. Mobile gọi (đã có account đăng nhập) để quét và xác nhận đăng nhập QR.
     */
    @Transactional
    public void confirmQrCode(String qrToken, String userId, String deviceId) {
        QrSession qrSession = qrSessionRepository.findByQrToken(qrToken)
                .orElseThrow(() -> new ResourceNotFoundException("Mã QR không tồn tại hoặc đã hết hạn."));
        
        // Không cần check expiresAt nữa vì Redis đã tự xóa bằng TTL
        if (qrSession.getStatus() != QrAuthStatus.PENDING && qrSession.getStatus() != QrAuthStatus.SCANNED) {
            throw new AppException(410, "Mã QR này đã được xử lý hoặc hết hạn.");
        }

        qrSession.setStatus(QrAuthStatus.CONFIRMED);
        qrSession.setUserId(userId);
        qrSession.setDeviceId(deviceId != null ? deviceId : "unknown");
        
        qrSessionRepository.save(qrSession);
    }

    /**
     * 3. Web gọi (liên tục/polling) để kiểm tra xem QR đã được quét chưa.
     */
    @Transactional
    public QrSessionResponse checkQrStatus(String qrToken, HttpServletResponse response) {
        QrSession qrSession = qrSessionRepository.findByQrToken(qrToken).orElse(null);
        
        if (qrSession == null) {
            return QrSessionResponse.builder()
                    .qrToken(qrToken)
                    .status(QrAuthStatus.EXPIRED) // Nếu Redis không còn -> Hết hạn
                    .build();
        }

        if (qrSession.getStatus() == QrAuthStatus.PENDING || qrSession.getStatus() == QrAuthStatus.SCANNED) {
            return QrSessionResponse.builder()
                    .qrToken(qrToken)
                    .status(qrSession.getStatus())
                    .build();
        }

        // Đã CONFIRMED
        if (qrSession.getStatus() == QrAuthStatus.CONFIRMED) {
            User user = userRepository.findById(qrSession.getUserId())
                    .orElseThrow(() -> new ResourceNotFoundException("User không tồn tại"));

            // --- Logic Tạo Token giống hệt AuthService.login ---
            String sessionId = UUID.randomUUID().toString();
            String accessToken = tokenService.generateAccessToken(user, sessionId);
            String refreshToken = tokenService.generateRefreshToken(user, qrSession.getDeviceId());
            String tokenId = tokenService.getTokenIdFromJWT(refreshToken);

            UserSession session = UserSession.builder()
                    .id(sessionId)
                    .user(user)
                    .deviceId(qrSession.getDeviceId())
                    .refreshTokenId(tokenId)
                    .ipAddress("0.0.0.0") 
                    .expiresAt(LocalDateTime.now().plusDays(7))
                    .build();
            sessionRepository.save(session);

            cookieUtil.createHttpOnlyCookie(response, "refreshToken", refreshToken, 604800);

            // Xóa session QR trong DB để tránh dùng lại (1 time use)
            qrSessionRepository.delete(qrSession);

            return QrSessionResponse.builder()
                    .qrToken(qrToken)
                    .status(QrAuthStatus.CONFIRMED)
                    .accessToken(accessToken)
                    .build();
        }

        return QrSessionResponse.builder()
                .qrToken(qrToken)
                .status(QrAuthStatus.EXPIRED) // fallback
                .build();
    }
}
