package edu.iuh.fit.auth_service.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateAdminRequest(
        @NotBlank(message = "Email không được trống")
        @Email(message = "Email không hợp lệ")
        String email,
        @NotBlank(message = "Mật khẩu không được trống")
        @Size(min = 8, message = "Mật khẩu tối thiểu 8 ký tự")
        String password,
        @NotBlank(message = "Tên không được trống")
        String name,
        String role
        ) {

}
