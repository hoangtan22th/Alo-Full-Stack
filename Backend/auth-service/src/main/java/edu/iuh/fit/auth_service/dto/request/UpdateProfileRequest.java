package edu.iuh.fit.auth_service.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record UpdateProfileRequest(
        @NotBlank(message = "Họ và tên không được để trống")
        @Size(min = 2, max = 50, message = "Họ và tên nên từ 2 đến 50 ký tự")
        String fullName,

        @NotBlank(message = "Số điện thoại không được để trống")
        @Pattern(regexp = "^0[35789]\\d{8}$", message = "Số điện thoại không hợp lệ (Bắt đầu bằng 0, đủ 10 số)")
        String phoneNumber,

        Integer gender,

        LocalDate dateOfBirth,

        @Email(message = "Email không đúng định dạng")
        String email
) {}