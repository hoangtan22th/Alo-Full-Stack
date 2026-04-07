package edu.iuh.fit.auth_service.dto.request;

public record ResetPasswordRequest(String email, String otp, String newPassword) {
}
