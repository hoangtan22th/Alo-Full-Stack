package edu.iuh.fit.chatbot_service.config;

import edu.iuh.fit.chatbot_service.client.ReportClient;
import edu.iuh.fit.common_service.dto.response.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.stereotype.Component;

@Component("reportAiTools")
@Slf4j
public class ReportAiTools {

    private final ReportClient reportClient;

    public ReportAiTools(ReportClient reportClient) {
        this.reportClient = reportClient;
    }

    @Tool(description = "Đếm số lần vi phạm (tiền án) trong quá khứ của đối tượng bị báo cáo (user hoặc group) từ cơ sở dữ liệu")
    public long countTargetViolations(String targetId) {
        log.info("[AI Tool] Triggered countTargetViolations for Target ID: {}", targetId);
        try {
            ApiResponse<Long> response = reportClient.countViolations(targetId);
            if (response != null && response.getData() != null) {
                long violationsCount = response.getData();
                log.info("[AI Tool] countTargetViolations returned {} violations for Target ID: {}", 
                        violationsCount, targetId);
                return violationsCount;
            }
        } catch (Exception e) {
            log.error("[AI Tool] Failed to fetch violations for Target ID: {}", targetId, e);
        }
        return 0L;
    }
}
