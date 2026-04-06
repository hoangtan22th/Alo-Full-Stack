package edu.iuh.fit.auth_service.dto.request;

import java.time.LocalDate;

public record UpdateProfileRequest(
        String fullName,
        String phoneNumber,
        Integer gender,
        LocalDate dateOfBirth
) {}