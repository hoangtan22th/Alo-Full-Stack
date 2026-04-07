package edu.iuh.fit.auth_service.dto.request;

public record ChangePasswordRequest(String oldPassword, String newPassword) {
}
