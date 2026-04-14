package edu.iuh.fit.chatbot_service.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import java.util.List;
import java.util.Map;

@FeignClient(name = "api-gateway", url = "${api.gateway.url:http://localhost:8080}")
public interface MessageClient {
    @GetMapping("/api/messages/search")
    List<Map<String, Object>> searchMessages(@RequestParam("userId") String userId,
                                             @RequestParam("keyword") String keyword);
}