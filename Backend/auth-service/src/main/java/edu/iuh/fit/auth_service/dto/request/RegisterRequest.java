package edu.iuh.fit.auth_service.dto.request;



public record RegisterRequest(String email, String password, String fullName) {}