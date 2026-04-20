package edu.iuh.fit.auth_service.service;

import edu.iuh.fit.auth_service.dto.response.QrSessionResponse;
import edu.iuh.fit.auth_service.entity.Account;
import edu.iuh.fit.auth_service.entity.QrSession;
import edu.iuh.fit.auth_service.entity.UserSession;
import edu.iuh.fit.auth_service.enums.QrAuthStatus;
import edu.iuh.fit.auth_service.repository.AccountRepository;
import edu.iuh.fit.auth_service.repository.QrSessionRepository;
import edu.iuh.fit.auth_service.repository.UserSessionRepository;
import edu.iuh.fit.auth_service.util.CookieUtil;
import edu.iuh.fit.common_service.exception.AppException;
import edu.iuh.fit.common_service.exception.ResourceNotFoundException;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class QrAuthService {

    private final TokenService tokenService;
    @Lazy
    private final AuthService authService; // Thêm authService để dọn dẹp các session trỏ đè
    private final AccountRepository accountRepository;
    private final UserSessionRepository sessionRepository;
    private final QrSessionRepository qrSessionRepository;
    private final CookieUtil cookieUtil;

    private static final long QR_TTL_MINUTES = 3;

    public QrSessionResponse generateQrToken() {
        String qrToken = UUID.randomUUID().toString();
        
        QrSession qrSession = QrSession.builder()
                .qrToken(qrToken)
                .status(QrAuthStatus.PENDING)
                .createdAt(LocalDateTime.now())
                .expiresAt(LocalDateTime.now().plusMinutes(QR_TTL_MINUTES))
                .timeToLive(QR_TTL_MINUTES * 60)
                .build();
        qrSessionRepository.save(qrSession);

        return QrSessionResponse.builder()
                .qrToken(qrToken)
                .status(QrAuthStatus.PENDING)
                .build();
    }

    @Transactional
    public void confirmQrCode(String qrToken, String userId, String deviceId) {
        QrSession qrSession = qrSessionRepository.findByQrToken(qrToken)
                .orElseThrow(() -> new ResourceNotFoundException("Mã QR không tồn tại hoặc đã hết hạn."));
        
        if (qrSession.getStatus() != QrAuthStatus.PENDING && qrSession.getStatus() != QrAuthStatus.SCANNED) {
            throw new AppException(410, "Mã QR này đã được xử lý hoặc hết hạn.");
        }

        qrSession.setStatus(QrAuthStatus.CONFIRMED);
        qrSession.setUserId(userId);
        qrSession.setDeviceId(deviceId != null ? deviceId : "unknown");
        
        qrSessionRepository.save(qrSession);
    }

    @Transactional
    public QrSessionResponse checkQrStatus(String qrToken, jakarta.servlet.http.HttpServletRequest request, HttpServletResponse response) {
        QrSession qrSession = qrSessionRepository.findByQrToken(qrToken).orElse(null);
        
        if (qrSession == null) {
            return QrSessionResponse.builder().qrToken(qrToken).status(QrAuthStatus.EXPIRED).build();
        }

        if (qrSession.getStatus() == QrAuthStatus.PENDING || qrSession.getStatus() == QrAuthStatus.SCANNED) {
            return QrSessionResponse.builder().qrToken(qrToken).status(qrSession.getStatus()).build();
        }

        if (qrSession.getStatus() == QrAuthStatus.CONFIRMED) {
            Account account = accountRepository.findById(qrSession.getUserId())
                    .orElseThrow(() -> new ResourceNotFoundException("User không tồn tại"));

            String sessionId = UUID.randomUUID().toString();
            String webDeviceId = "Trình duyệt Web"; // Đăng nhập qua QR luôn là Web
            
            // Xóa triệt để các session Web cũ trước khi lưu session web mới!
            try {
                authService.invalidateOldSessions(account.getId(), sessionId, webDeviceId);
            } catch (Exception e) {
                log.error("Failed to invalidate old web sessions during QR login", e);
            }

            String accessToken = tokenService.generateAccessToken(account, sessionId);
            String refreshToken = tokenService.generateRefreshToken(account, webDeviceId);
            String tokenId = tokenService.getTokenIdFromJWT(refreshToken);
            
            String ipAddress = getClientIpString(request);

            UserSession session = UserSession.builder()
                    .id(sessionId)
                    .account(account)
                    .deviceId(webDeviceId) // <-- Thay vì gắn cho "Mobile-AloChat" thì gắn về cho Web
                    .refreshTokenId(tokenId)
                    .ipAddress(ipAddress) 
                    .expiresAt(LocalDateTime.now().plusDays(7))
                    .build();
            sessionRepository.save(session);

            cookieUtil.createHttpOnlyCookie(response, "refreshToken", refreshToken, 604800);
            qrSessionRepository.delete(qrSession);

            return QrSessionResponse.builder()
                    .qrToken(qrToken)
                    .status(QrAuthStatus.CONFIRMED)
                    .accessToken(accessToken)
                    .build();
        }

        return QrSessionResponse.builder().qrToken(qrToken).status(QrAuthStatus.EXPIRED).build();
    }

    private String getClientIpString(jakarta.servlet.http.HttpServletRequest request) {
        if (request == null) return "unknown";
        String ipAddress = request.getHeader("X-Forwarded-For");
        if (ipAddress == null || ipAddress.isEmpty() || "unknown".equalsIgnoreCase(ipAddress)) {
            ipAddress = request.getRemoteAddr();
        }
        if (ipAddress != null && ipAddress.indexOf(',') > 0) {
            ipAddress = ipAddress.substring(0, ipAddress.indexOf(',')).trim();
        }
        return ipAddress;
    }
}
