package edu.iuh.fit.auth_service.dto.response;

public record UserResponse(
        String id,
        String email,
        String fullName,
        String phoneNumber,
        String avatar
) {}