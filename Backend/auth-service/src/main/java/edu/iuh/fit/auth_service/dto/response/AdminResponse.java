package edu.iuh.fit.auth_service.dto.response;

import java.time.LocalDateTime;

public record AdminResponse(
        String id,
        String email,
        String name,
        String role,
        LocalDateTime createdAt
) {}