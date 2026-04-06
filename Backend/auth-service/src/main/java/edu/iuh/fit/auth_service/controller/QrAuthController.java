package edu.iuh.fit.auth_service.controller;

import edu.iuh.fit.auth_service.dto.request.QrVerifyRequest;
import edu.iuh.fit.auth_service.dto.response.QrSessionResponse;
import edu.iuh.fit.auth_service.service.QrAuthService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth/qr")
@RequiredArgsConstructor
public class QrAuthController {

    private final QrAuthService qrAuthService;

    // 1. Web tạo chuỗi mã QR mới
    @GetMapping("/generate")
    public ResponseEntity<QrSessionResponse> generateQrCode() {
        return ResponseEntity.ok(qrAuthService.generateQrToken());
    }

    // 2. Mobile gọi để xác nhận thiết bị quét
    // API Gateway (hoặc filter) đã xác thực JWT của Mobile và chèn X-User-Id vào Header.
    @PostMapping("/verify")
    public ResponseEntity<String> verifyQrCode(
            @RequestHeader("X-User-Id") String userId,
            @RequestBody QrVerifyRequest request) {
        
        qrAuthService.confirmQrCode(request.qrToken(), userId, request.deviceId());
        return ResponseEntity.ok("Xác nhận đăng nhập mã QR thành công!");
    }

    // 3. Web polling/gọi định kỳ mỗi ~2s để kiểm tra xem mã QR đã được quét chưa
    // Nếu thành công sẽ nhận được accessToken và tự động set cookie refreshToken
    @GetMapping("/status/{qrToken}")
    public ResponseEntity<QrSessionResponse> checkQrStatus(
            @PathVariable String qrToken,
            HttpServletResponse response) {
        
        return ResponseEntity.ok(qrAuthService.checkQrStatus(qrToken, response));
    }
}
