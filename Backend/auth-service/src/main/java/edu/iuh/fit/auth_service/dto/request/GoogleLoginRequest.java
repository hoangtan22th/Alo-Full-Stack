package edu.iuh.fit.auth_service.dto.request;

public record GoogleLoginRequest(String idToken, String deviceId) {}
