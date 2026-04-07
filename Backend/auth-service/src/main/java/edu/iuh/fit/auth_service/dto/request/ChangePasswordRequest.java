package edu.iuh.fit.auth_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record ChangePasswordRequest(
    @NotBlank(message = "Mật khẩu cũ không được để trống")
    String oldPassword,

    @NotBlank(message = "Mật khẩu mới không được để trống")
    @Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$", message = "Mật khẩu phải dài ít nhất 8 ký tự, bao gồm chữ Hoa, chữ Thường và Số")
    String newPassword
) {
}
