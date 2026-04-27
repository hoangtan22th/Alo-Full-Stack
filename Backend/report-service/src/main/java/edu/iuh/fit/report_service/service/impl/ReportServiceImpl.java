package edu.iuh.fit.report_service.service.impl;

import edu.iuh.fit.common_service.dto.response.ApiResponse;
import edu.iuh.fit.report_service.client.UserClient;
import edu.iuh.fit.report_service.config.RabbitMQConfig;
import edu.iuh.fit.report_service.dto.event.ReportCreatedEvent;
import edu.iuh.fit.report_service.dto.event.ReportResolvedEvent;
import edu.iuh.fit.report_service.dto.event.UserBannedEvent;
import edu.iuh.fit.report_service.dto.event.UserWarnedEvent;
import edu.iuh.fit.report_service.dto.request.AdminActionRequest;
import edu.iuh.fit.report_service.dto.request.ReportCreationRequest;
import edu.iuh.fit.report_service.dto.response.ReportAdminResponse;
import edu.iuh.fit.report_service.dto.response.ReportResponse;
import edu.iuh.fit.report_service.dto.response.UserResponse;
import edu.iuh.fit.report_service.entity.Report;
import edu.iuh.fit.report_service.entity.ReportStatus;
import edu.iuh.fit.report_service.entity.TargetType;
import edu.iuh.fit.report_service.repository.ReportRepository;
import edu.iuh.fit.report_service.service.ReportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import feign.FeignException;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportServiceImpl implements ReportService {

    private final ReportRepository reportRepository;
    private final UserClient userClient;
    private final RabbitTemplate rabbitTemplate;

    @Override
    public ReportResponse createReport(ReportCreationRequest request) {
        log.info("Creating new report from reporter {} targeting {}", request.getReporterId(), request.getTargetId());

        boolean hasImages = request.getImageUrls() != null && !request.getImageUrls().isEmpty();
        boolean hasMessages = request.getMessageIds() != null && !request.getMessageIds().isEmpty();

        if (request.getTargetType() == TargetType.GROUP) {
            if (hasImages || hasMessages) {
                throw new IllegalArgumentException("GROUP reports cannot contain image URLs or message IDs. Group reports are strictly about the group's existence/metadata.");
            }
        } else if (request.getTargetType() == TargetType.USER) {
            if (request.getMessageIds() != null) {
                int messageCount = request.getMessageIds().size();
                if (messageCount < 3 || messageCount > 40) {
                    throw new IllegalArgumentException("USER reports must contain exactly between 3 and 40 message IDs if evidence is provided. Current count: " + messageCount);
                }
            }
        }

        boolean hasDescription = request.getDescription() != null && !request.getDescription().trim().isEmpty();
        if (!hasDescription && !hasImages && !hasMessages && request.getTargetType() == TargetType.USER) {
             throw new IllegalArgumentException("At least one piece of evidence (description, images, or messages) is required for reporting a USER.");
        }

        Report report = Report.builder()
                .reporterId(request.getReporterId())
                .targetId(request.getTargetId())
                .targetType(request.getTargetType())
                .reason(request.getReason())
                .description(request.getDescription())
                .imageUrls(request.getImageUrls())
                .messageIds(request.getMessageIds())
                .status(ReportStatus.PENDING) 
                .build();

        Report savedReport = reportRepository.save(report);

        log.info("Report created successfully with ID: {}", savedReport.getId());

        // Publish report created event
        String targetName = "Unknown";
        if (report.getTargetType() == TargetType.USER) {
            targetName = fetchUserSafe(report.getTargetId()).getFullName();
        }
        
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.EXCHANGE_NAME,
                RabbitMQConfig.ROUTING_KEY_REPORT_CREATED,
                ReportCreatedEvent.builder()
                        .reportId(savedReport.getId())
                        .reporterId(savedReport.getReporterId())
                        .targetId(savedReport.getTargetId())
                        .targetType(savedReport.getTargetType().name())
                        .targetName(targetName)
                        .reason(savedReport.getReason().name())
                        .build()
        );

        return ReportResponse.builder()
                .id(savedReport.getId())
                .reporterId(savedReport.getReporterId())
                .targetId(savedReport.getTargetId())
                .targetType(savedReport.getTargetType())
                .reason(savedReport.getReason())
                .status(savedReport.getStatus())
                .createdAt(savedReport.getCreatedAt())
                .build();
    }

    @Override
    public Page<ReportAdminResponse> getAdminReports(ReportStatus status, Pageable pageable) {
        Page<Report> reports;
        if (status != null) {
            reports = reportRepository.findByStatus(status, pageable);
        } else {
            reports = reportRepository.findAll(pageable);
        }

        return reports.map(this::mapToAdminResponse);
    }

    @Override
    public ReportAdminResponse resolveReport(String reportId, AdminActionRequest actionRequest) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new RuntimeException("Report not found with ID: " + reportId));

        report.setAdminNotes(actionRequest.getAdminNotes());
        report.setResolvedBy(actionRequest.getAdminId());

        String targetName = "Unknown";
        if (report.getTargetType() == TargetType.USER) {
            targetName = fetchUserSafe(report.getTargetId()).getFullName();
        } else if (report.getTargetType() == TargetType.GROUP) {
            // For future: fetch group name if needed, for now use a placeholder or ID
            targetName = "Nhóm " + report.getTargetId(); 
        }

        switch (actionRequest.getAction()) {
            case DISMISS:
                report.setStatus(ReportStatus.REJECTED);
                break;
            case WARN:
                report.setStatus(ReportStatus.RESOLVED);
                if (report.getTargetType() == TargetType.USER) {
                    publishWarnEvent(report);
                }
                break;
            case BAN:
                report.setStatus(ReportStatus.RESOLVED);
                if (report.getTargetType() == TargetType.USER) {
                    publishBanEvent(report);
                }
                break;
        }

        Report savedReport = reportRepository.save(report);

        // Publish report resolved event
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.EXCHANGE_NAME,
                RabbitMQConfig.ROUTING_KEY_REPORT_RESOLVED,
                ReportResolvedEvent.builder()
                        .reportId(savedReport.getId())
                        .targetId(savedReport.getTargetId())
                        .targetType(savedReport.getTargetType().name())
                        .targetName(targetName)
                        .action(actionRequest.getAction().name())
                        .reason(savedReport.getReason() != null ? savedReport.getReason().name() : "Không có lý do")
                        .build()
        );

        return mapToAdminResponse(savedReport);
    }

    private void publishBanEvent(Report report) {
        try {
            UserBannedEvent event = UserBannedEvent.builder()
                    .targetId(report.getTargetId())
                    .adminNotes(report.getAdminNotes())
                    .resolvedBy(report.getResolvedBy())
                    .timestamp(LocalDateTime.now())
                    .build();
            
            rabbitTemplate.convertAndSend(RabbitMQConfig.EXCHANGE_NAME, RabbitMQConfig.ROUTING_KEY_USER_BANNED, event);
            log.info("Published USER_BANNED_EVENT to RabbitMQ for TargetId: {}", report.getTargetId());
        } catch (Exception e) {
            log.error("Failed to publish BANNED event for TargetId: {}", report.getTargetId(), e);
        }
    }

    private void publishWarnEvent(Report report) {
        try {
            UserWarnedEvent event = UserWarnedEvent.builder()
                    .targetId(report.getTargetId())
                    .adminNotes(report.getAdminNotes())
                    .resolvedBy(report.getResolvedBy())
                    .timestamp(LocalDateTime.now())
                    .build();
            
            rabbitTemplate.convertAndSend(RabbitMQConfig.EXCHANGE_NAME, RabbitMQConfig.ROUTING_KEY_USER_WARNED, event);
            log.info("Published USER_WARNED_EVENT to RabbitMQ for TargetId: {}", report.getTargetId());
        } catch (Exception e) {
            log.error("Failed to publish WARNED event for TargetId: {}", report.getTargetId(), e);
        }
    }

    private ReportAdminResponse mapToAdminResponse(Report report) {
        
        // Fetch reporter info
        UserResponse reporter = fetchUserSafe(report.getReporterId());
        
        // Fetch target info ONLY if targetType is USER
        UserResponse targetUser = null;
        if (report.getTargetType() == TargetType.USER) {
            targetUser = fetchUserSafe(report.getTargetId());
        }
        
        return ReportAdminResponse.builder()
                .id(report.getId())
                .reporter(reporter)
                .targetId(report.getTargetId())
                .targetUser(targetUser)
                .targetType(report.getTargetType())
                .reason(report.getReason())
                .status(report.getStatus())
                .description(report.getDescription())
                .imageUrls(report.getImageUrls())
                .messageIds(report.getMessageIds())
                .adminNotes(report.getAdminNotes())
                .resolvedBy(report.getResolvedBy())
                .createdAt(report.getCreatedAt())
                .updatedAt(report.getUpdatedAt())
                .build();
    }

    private UserResponse fetchUserSafe(String userId) {
        if (userId == null || userId.isBlank()) {
            log.warn("fetchUserSafe called with blank userId, skipping.");
            return UserResponse.builder().id("").fullName("Unknown User").build();
        }
        try {
            ApiResponse<UserResponse> response = userClient.getUserById(userId);
            if (response != null && response.getData() != null) {
                return response.getData();
            }
        } catch (FeignException.NotFound e) {
            log.warn("User not found for ID: {} (404 from user-service)", userId);
        } catch (FeignException e) {
            log.error("Feign error fetching user {} — status: {}, body: {}",
                    userId, e.status(), e.contentUTF8());
        } catch (Exception e) {
            log.error("Unexpected error fetching user {}: {}", userId, e.getMessage());
        }
        return UserResponse.builder().id(userId).fullName("Unknown User").build();
    }
}
