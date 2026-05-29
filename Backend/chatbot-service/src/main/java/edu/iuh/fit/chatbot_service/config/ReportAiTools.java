package edu.iuh.fit.chatbot_service.config;

import edu.iuh.fit.chatbot_service.client.ReportClient;
import edu.iuh.fit.common_service.dto.response.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.ToolDefinition;
import org.springframework.stereotype.Component;

@Component("reportAiTools")
@Slf4j
public class ReportAiTools implements ToolCallback {

    private final ReportClient reportClient;

    public ReportAiTools(ReportClient reportClient) {
        this.reportClient = reportClient;
    }

    @Override
    public ToolDefinition getToolDefinition() {
        return new ToolDefinition() {
            @Override
            public String name() {
                return "countTargetViolations";
            }

            @Override
            public String description() {
                return "Đếm số lần vi phạm (tiền án) trong quá khứ của đối tượng bị báo cáo (user hoặc group) từ cơ sở dữ liệu";
            }

            @Override
            public String inputSchema() {
                return """
                    {
                      "type": "object",
                      "properties": {
                        "targetId": {
                          "type": "string",
                          "description": "ID của đối tượng bị báo cáo để kiểm tra tiền án"
                        }
                      },
                      "required": ["targetId"]
                    }
                    """;
            }
        };
    }

    @Override
    public String call(String toolInput) {
        log.info("[AI Tool Callback] Raw toolInput JSON string received: {}", toolInput);
        try {
            // Parse targetId from toolInput JSON safely: {"targetId": "..."}
            String targetId = null;
            if (toolInput != null && toolInput.contains("targetId")) {
                int start = toolInput.indexOf("targetId") + 8;
                int valStart = toolInput.indexOf("\"", start) + 1;
                int valEnd = toolInput.indexOf("\"", valStart);
                if (valStart > 0 && valEnd > valStart) {
                    targetId = toolInput.substring(valStart, valEnd);
                }
            }

            if (targetId == null || targetId.isBlank()) {
                log.warn("[AI Tool Callback] Failed to parse targetId from input: {}", toolInput);
                return "0";
            }

            log.info("[AI Tool Callback] Executing countTargetViolations for Target ID: {}", targetId);
            ApiResponse<Long> response = reportClient.countViolations(targetId);
            if (response != null && response.getData() != null) {
                long violationsCount = response.getData();
                log.info("[AI Tool Callback] Query returned {} violations for Target ID: {}", 
                        violationsCount, targetId);
                return String.valueOf(violationsCount);
            }
        } catch (Exception e) {
            log.error("[AI Tool Callback] Error processing tool callback invocation", e);
        }
        return "0";
    }
}
