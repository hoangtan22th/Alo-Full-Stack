package com.alochat.chatbotservice.dto;

import java.io.Serializable;

public record ChatRequest (String message) implements Serializable {

}
