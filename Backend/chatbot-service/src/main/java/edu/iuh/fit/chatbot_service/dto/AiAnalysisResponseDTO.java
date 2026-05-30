package edu.iuh.fit.chatbot_service.dto;

public record AiAnalysisResponseDTO(
    String summary,
    String suggestedAction,
    Double confidence
) {}
