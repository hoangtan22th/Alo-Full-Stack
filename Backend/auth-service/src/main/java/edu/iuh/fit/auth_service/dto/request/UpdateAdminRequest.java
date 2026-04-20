package edu.iuh.fit.auth_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateAdminRequest(
        @NotBlank(message = "Tên không được trống")
        String name,
        @Size(min = 8, message = "Mật khẩu tối thiểu 8 ký tự")
        String password,
        @NotBlank(message = "Quyền không được trống")
        String role
        ) {

}
