package edu.iuh.fit.auth_service.dto.response;
import java.time.LocalDateTime;

public record UserSessionResponse(String id, String deviceId, String ipAddress, LocalDateTime createdAt, boolean isCurrent) {}