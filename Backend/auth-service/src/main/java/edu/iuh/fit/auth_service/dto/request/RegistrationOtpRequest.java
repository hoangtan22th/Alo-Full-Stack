package edu.iuh.fit.auth_service.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record RegistrationOtpRequest(
    @NotBlank(message = "Email không được để trống") 
    @Email(message = "Email không đúng định dạng") 
    String email,

    @NotBlank(message = "Số điện thoại không được để trống")
    @Pattern(regexp = "^0[35789]\\d{8}$", message = "Số điện thoại không hợp lệ (Phải là đầu số mạng VN hợp lệ: 03, 05, 07, 08, 09)")
    String phoneNumber
) {}
