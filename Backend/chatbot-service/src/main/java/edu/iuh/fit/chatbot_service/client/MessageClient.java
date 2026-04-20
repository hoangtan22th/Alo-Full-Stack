package edu.iuh.fit.chatbot_service.client;

import edu.iuh.fit.chatbot_service.dto.MessageHistoryResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(name = "message-service", path = "/api/v1/messages")
public interface MessageClient {

    @GetMapping("/{conversationId}")
    MessageHistoryResponse getHistory(
            @PathVariable("conversationId") String conversationId,
            @RequestParam(value = "limit", defaultValue = "50") int limit,
            @RequestHeader("x-user-id") String userId
    );
}