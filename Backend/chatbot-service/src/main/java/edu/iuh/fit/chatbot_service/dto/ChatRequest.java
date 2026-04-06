package edu.iuh.fit.chatbot_service.dto;

import java.io.Serializable;

public record ChatRequest (String message) implements Serializable {

}
