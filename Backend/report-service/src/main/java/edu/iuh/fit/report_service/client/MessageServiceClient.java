package edu.iuh.fit.report_service.client;

import edu.iuh.fit.report_service.dto.MessageDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "message-service")
public interface MessageServiceClient {

    @GetMapping("/api/v1/messages/{messageId}")
    MessageDto getMessageById(@PathVariable("messageId") String messageId);
}
