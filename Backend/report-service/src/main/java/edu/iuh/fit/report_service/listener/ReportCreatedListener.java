package edu.iuh.fit.report_service.listener;

import edu.iuh.fit.common_service.dto.response.ApiResponse;
import edu.iuh.fit.report_service.client.ChatbotClient;
import edu.iuh.fit.report_service.config.RabbitMQConfig;
import edu.iuh.fit.report_service.dto.event.ReportCreatedEvent;
import edu.iuh.fit.report_service.dto.request.ReportAnalysisRequest;
import edu.iuh.fit.report_service.dto.response.AiAnalysisResponse;
import edu.iuh.fit.report_service.entity.Report;
import edu.iuh.fit.report_service.repository.ReportRepository;
import edu.iuh.fit.report_service.util.HashUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Optional;

@Component
@Slf4j
@RequiredArgsConstructor
public class ReportCreatedListener {

    private final ReportRepository reportRepository;
    private final ChatbotClient chatbotClient;

    @RabbitListener(queues = RabbitMQConfig.QUEUE_REPORT_AI_ANALYZE)
    public void handleReportCreated(ReportCreatedEvent event) {
        log.info("[AI Moderation Worker] Received report.created event for Report ID: {}", event.getReportId());

        try {
            Report report = reportRepository.findById(event.getReportId()).orElse(null);
            if (report == null) {
                log.warn("[AI Moderation Worker] Report ID {} not found in database.", event.getReportId());
                return;
            }

            // 1. Calculate deterministic snapshot SHA-256 hash
            String hash = HashUtil.calculateSnapshotHash(report.getReason().name(), report.getMessageSnapshots());
            report.setSnapshotHash(hash);
            reportRepository.save(report);

            // 2. Perform Cache Check (Composite Hashing)
            Optional<Report> cachedReportOpt = reportRepository.findFirstBySnapshotHashAndAiSummaryIsNotNull(hash);

            if (cachedReportOpt.isPresent()) {
                Report cached = cachedReportOpt.get();
                log.info("[AI Moderation Worker] HIT CACHE! Copying AI results from Report ID {} to Report ID {}", 
                        cached.getId(), report.getId());

                report.setAiSummary(cached.getAiSummary());
                report.setAiSuggestedAction(cached.getAiSuggestedAction());
                report.setAiConfidence(cached.getAiConfidence());
                report.setAiAnalyzedAt(LocalDateTime.now());
                reportRepository.save(report);
            } else {
                log.info("[AI Moderation Worker] MISS CACHE! Requesting AI engine analysis from chatbot-service for Report ID {}", report.getId());
                
                ReportAnalysisRequest requestPayload = ReportAnalysisRequest.builder()
                        .reportId(report.getId())
                        .reason(report.getReason().name())
                        .targetId(report.getTargetId())
                        .targetType(report.getTargetType().name())
                        .targetName(report.getTargetName())
                        .conversationType(report.getConversationType() != null ? report.getConversationType().name() : "ONE_TO_ONE")
                        .messageSnapshots(report.getMessageSnapshots())
                        .build();

                try {
                    ApiResponse<AiAnalysisResponse> apiResponse = chatbotClient.analyzeReport(requestPayload);
                    if (apiResponse != null && apiResponse.getData() != null) {
                        AiAnalysisResponse analysis = apiResponse.getData();
                        
                        report.setAiSummary(analysis.getSummary());
                        report.setAiSuggestedAction(analysis.getSuggestedAction());
                        report.setAiConfidence(analysis.getConfidence());
                        report.setAiAnalyzedAt(LocalDateTime.now());
                        
                        reportRepository.save(report);
                        log.info("[AI Moderation Worker] AI engine scan completed successfully for Report ID: {}", report.getId());
                    } else {
                        log.warn("[AI Moderation Worker] Empty response from chatbot-service. Applying safe fallback.");
                        saveFallbackResults(report);
                    }
                } catch (Exception feignEx) {
                    log.error("[AI Moderation Worker] Feign client communication failure with chatbot-service", feignEx);
                    saveFallbackResults(report);
                }
            }
        } catch (Exception e) {
            log.error("[AI Moderation Worker] Unexpected exception in listener thread", e);
        }
    }

    private void saveFallbackResults(Report report) {
        try {
            report.setAiSummary("[Hệ thống] Trục trặc kỹ thuật kết nối AI engine. Không thể phân tích nội dung.");
            report.setAiSuggestedAction("DISMISS");
            report.setAiConfidence(0.0);
            report.setAiAnalyzedAt(LocalDateTime.now());
            reportRepository.save(report);
        } catch (Exception ex) {
            log.error("[AI Moderation Worker] Failed to write fallback results to database", ex);
        }
    }
}
