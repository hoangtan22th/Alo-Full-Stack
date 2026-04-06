package edu.iuh.fit.auth_service.dto.request;

public record QrVerifyRequest(
        String qrToken,
        String deviceId
) {
}
