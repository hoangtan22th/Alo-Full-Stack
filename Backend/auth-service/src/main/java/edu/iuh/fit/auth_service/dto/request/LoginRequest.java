package edu.iuh.fit.auth_service.dto.request;



public record LoginRequest(String email, String password, String deviceId) {}