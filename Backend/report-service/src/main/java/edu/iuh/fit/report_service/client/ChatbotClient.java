package edu.iuh.fit.report_service.client;

import edu.iuh.fit.common_service.dto.response.ApiResponse;
import edu.iuh.fit.report_service.dto.request.ReportAnalysisRequest;
import edu.iuh.fit.report_service.dto.response.AiAnalysisResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(name = "chatbot-service")
public interface ChatbotClient {

    @PostMapping("/api/v1/chatbot/analyze-report")
    ApiResponse<AiAnalysisResponse> analyzeReport(@RequestBody ReportAnalysisRequest request);
}
