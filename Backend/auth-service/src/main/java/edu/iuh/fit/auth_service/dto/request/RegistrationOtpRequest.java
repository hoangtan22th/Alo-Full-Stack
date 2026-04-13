package edu.iuh.fit.auth_service.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record RegistrationOtpRequest(
    @NotBlank(message = "Email không được để trống") 
    @Email(message = "Email không đúng định dạng") 
    String email
) {}
