package edu.iuh.fit.chatbot_service.config;

import edu.iuh.fit.chatbot_service.client.ReportClient;
import edu.iuh.fit.common_service.dto.response.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Description;

import java.util.function.Function;

@Configuration
@Slf4j
public class ReportAiTools {

    public record TargetViolationRequest(String targetId) {}
    public record TargetViolationResponse(long count) {}

    @Bean
    @Description("Đếm số lần vi phạm (tiền án) trong quá khứ của đối tượng bị báo cáo (user hoặc group) từ cơ sở dữ liệu")
    public Function<TargetViolationRequest, TargetViolationResponse> countTargetViolationsTool(ReportClient reportClient) {
        return request -> {
            log.info("[AI Tool] Triggered countTargetViolationsTool for Target ID: {}", request.targetId());
            try {
                ApiResponse<Long> response = reportClient.countViolations(request.targetId());
                if (response != null && response.getData() != null) {
                    long violationsCount = response.getData();
                    log.info("[AI Tool] countTargetViolationsTool returned {} violations for Target ID: {}", 
                            violationsCount, request.targetId());
                    return new TargetViolationResponse(violationsCount);
                }
            } catch (Exception e) {
                log.error("[AI Tool] Failed to fetch violations for Target ID: {}", request.targetId(), e);
            }
            return new TargetViolationResponse(0L);
        };
    }
}
