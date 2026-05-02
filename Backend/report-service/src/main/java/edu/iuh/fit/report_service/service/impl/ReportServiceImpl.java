package edu.iuh.fit.report_service.service.impl;

import edu.iuh.fit.common_service.dto.response.ApiResponse;
import edu.iuh.fit.report_service.client.GroupClient;
import edu.iuh.fit.report_service.client.UserClient;
import edu.iuh.fit.report_service.config.RabbitMQConfig;
import edu.iuh.fit.report_service.dto.event.ReportCreatedEvent;
import edu.iuh.fit.report_service.dto.event.ReportResolvedEvent;
import edu.iuh.fit.report_service.dto.event.UserBannedEvent;
import edu.iuh.fit.report_service.dto.event.UserWarnedEvent;
import edu.iuh.fit.report_service.dto.request.AdminActionRequest;
import edu.iuh.fit.report_service.dto.request.ReportCreationRequest;
import edu.iuh.fit.report_service.dto.response.GroupResponse;
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
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.support.PageableExecutionUtils;

import feign.FeignException;
import java.util.List;
import java.util.stream.Collectors;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationResults;
import org.springframework.data.domain.Sort;
import edu.iuh.fit.report_service.dto.response.ReportStatisticsResponse;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportServiceImpl implements ReportService {

    private final ReportRepository reportRepository;
    private final UserClient userClient;
    private final GroupClient groupClient;
    private final RabbitTemplate rabbitTemplate;
    private final MongoTemplate mongoTemplate;

    @Override
    public ReportResponse createReport(ReportCreationRequest request) {
        log.info("Creating new report from reporter {} targeting {}", request.getReporterId(), request.getTargetId());

        boolean hasImages = request.getImageUrls() != null && !request.getImageUrls().isEmpty();
        boolean hasMessages = request.getMessageIds() != null && !request.getMessageIds().isEmpty();

        if (request.getTargetType() == TargetType.GROUP) {
            if (hasImages || hasMessages) {
                throw new IllegalArgumentException(
                        "GROUP reports cannot contain image URLs or message IDs. Group reports are strictly about the group's existence/metadata.");
            }
        } else if (request.getTargetType() == TargetType.USER) {
            if (request.getMessageIds() != null && !request.getMessageIds().isEmpty()) {
                int messageCount = request.getMessageIds().size();
                if (messageCount < 3 || messageCount > 40) {
                    throw new IllegalArgumentException(
                            "USER reports must contain between 1 and 40 message IDs if evidence is provided. Current count: "
                                    + messageCount);
                }
            }
        }

        boolean hasDescription = request.getDescription() != null && !request.getDescription().trim().isEmpty();
        if (!hasDescription && !hasImages && !hasMessages && request.getTargetType() == TargetType.USER) {
            throw new IllegalArgumentException(
                    "At least one piece of evidence (description, images, or messages) is required for reporting a USER.");
        }

        // Fetch target name for persistence and events
        String targetName = "Unknown";
        if (request.getTargetType() == TargetType.USER) {
            targetName = fetchUserSafe(request.getTargetId()).getFullName();
        } else if (request.getTargetType() == TargetType.GROUP) {
            targetName = fetchGroupNameSafe(request.getTargetId());
        }

        Report report = Report.builder()
                .reporterId(request.getReporterId())
                .targetId(request.getTargetId())
                .targetType(request.getTargetType())
                .targetName(targetName)
                .reason(request.getReason())
                .description(request.getDescription())
                .imageUrls(request.getImageUrls())
                .messageIds(request.getMessageIds())
                .status(ReportStatus.PENDING)
                .build();

        Report savedReport = reportRepository.save(report);

        log.info("Report created successfully with ID: {}", savedReport.getId());

        // Publish report created event
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
                        .build());

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
    public Page<ReportAdminResponse> getAdminReports(ReportStatus status, String targetName,
            edu.iuh.fit.report_service.entity.TargetType targetType,
            edu.iuh.fit.report_service.entity.ReportReason reason, Pageable pageable) {
        Query query = new Query().with(pageable);

        if (status != null) {
            query.addCriteria(Criteria.where("status").is(status));
        }
        if (targetType != null) {
            query.addCriteria(Criteria.where("targetType").is(targetType));
        }
        if (reason != null) {
            query.addCriteria(Criteria.where("reason").is(reason));
        }
        if (targetName != null && !targetName.isEmpty()) {
            query.addCriteria(Criteria.where("targetName").regex(targetName, "i"));
        }

        List<Report> reports = mongoTemplate.find(query, Report.class);
        long count = mongoTemplate.count(Query.of(query).limit(-1).skip(-1), Report.class);

        List<ReportAdminResponse> list = reports.stream()
                .map(this::mapToAdminResponse)
                .collect(Collectors.toList());

        return PageableExecutionUtils.getPage(list, pageable, () -> count);
    }

    @Override
    public ReportAdminResponse resolveReport(String reportId, AdminActionRequest actionRequest) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new RuntimeException("Report not found with ID: " + reportId));

        report.setAdminNotes(actionRequest.getAdminNotes());
        report.setResolvedBy(actionRequest.getAdminId());
        report.setResolvedAction(actionRequest.getAction());

        String targetName = actionRequest.getTargetName();
        String leaderId = null;
        if (report.getTargetType() == TargetType.USER) {
            targetName = fetchUserSafe(report.getTargetId()).getFullName();
        } else if (report.getTargetType() == TargetType.GROUP) {
            try {
                GroupResponse gRes = groupClient.getGroupById(report.getTargetId());
                if (gRes != null && gRes.getData() != null) {
                    targetName = gRes.getData().getName();
                    if (gRes.getData().getMembers() != null) {
                        leaderId = gRes.getData().getMembers().stream()
                                .filter(m -> "LEADER".equals(m.getRole()))
                                .map(GroupResponse.GroupData.MemberData::getUserId)
                                .findFirst()
                                .orElse(null);
                    }
                }
            } catch (Exception e) {
                log.error("Failed to fetch group info for {}: {}", report.getTargetId(), e.getMessage());
                targetName = fetchGroupNameSafe(report.getTargetId());
            }
        }

        switch (actionRequest.getAction()) {
            case DISMISS:
                report.setStatus(ReportStatus.REJECTED);
                break;
            case WARN:
                report.setStatus(ReportStatus.RESOLVED);
                publishWarnEvent(report, targetName, leaderId);
                break;
            case BAN:
                report.setStatus(ReportStatus.RESOLVED);
                publishBanEvent(report, targetName, leaderId);
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
                        .build());

        // AUTO-RESOLVE DUPLICATES (Strict Rules)
        try {
            AdminActionRequest.AdminAction action = actionRequest.getAction();
            List<Report> duplicates = null;
            String autoNote;

            if (action == AdminActionRequest.AdminAction.BAN) {
                // RULE 2: BAN -> Resolve ALL other pending reports for this target
                duplicates = reportRepository.findByTargetIdAndStatus(report.getTargetId(), ReportStatus.PENDING);
                autoNote = "Hệ thống tự động xử lý gộp: Đối tượng đã bị CẤM (BAN) trong báo cáo ID: " + reportId;
            } else if (action == AdminActionRequest.AdminAction.WARN) {
                // RULE 3: WARN -> ONLY resolve reports with SAME REASON
                duplicates = reportRepository.findByTargetIdAndStatusAndReason(report.getTargetId(),
                        ReportStatus.PENDING, report.getReason());
                autoNote = "Hệ thống tự động xử lý gộp: Đối tượng đã nhận CẢNH CÁO cho cùng lý do này trong báo cáo ID: "
                        + reportId;
            } else {
                autoNote = "";
            }
            // RULE 1: DISMISS -> duplicates remains null, nothing happens

            if (duplicates != null && !duplicates.isEmpty()) {
                // Lọc bỏ chính báo cáo hiện tại (đã được lưu ở trên, nhưng findBy có thể lấy
                // lại nếu DB chưa sync)
                List<Report> toResolve = duplicates.stream()
                        .filter(dup -> !dup.getId().equals(reportId))
                        .collect(Collectors.toList());

                if (!toResolve.isEmpty()) {
                    log.info("Auto-resolving {} related reports for target {} due to action {}", toResolve.size(),
                            report.getTargetId(), action);
                    toResolve.forEach(dup -> {
                        dup.setStatus(ReportStatus.RESOLVED);
                        dup.setAdminNotes(autoNote);
                        dup.setResolvedBy("SYSTEM");
                    });
                    reportRepository.saveAll(toResolve);
                }
            }
        } catch (Exception e) {
            log.error("Failed to safely auto-resolve duplicate reports: {}", e.getMessage());
        }

        return mapToAdminResponse(savedReport);
    }

    @Override
    public ReportStatisticsResponse getStatistics() {
        log.info("Calculating report statistics...");

        // 1. Overview Metrics
        long totalPending = reportRepository.countByStatus(ReportStatus.PENDING);
        
        LocalDateTime todayStart = LocalDateTime.of(LocalDate.now(), LocalTime.MIN);
        long resolvedToday = reportRepository.countByStatusInAndUpdatedAtAfter(
                List.of(ReportStatus.RESOLVED, ReportStatus.REJECTED), todayStart);
        
        long totalBanned = reportRepository.countByResolvedAction(AdminActionRequest.AdminAction.BAN);

        // 2. Group By Reason
        Aggregation reasonAgg = Aggregation.newAggregation(
                Aggregation.group("reason").count().as("value"),
                Aggregation.project("value").and("name").previousOperation(),
                Aggregation.sort(Sort.Direction.DESC, "value")
        );
        List<ReportStatisticsResponse.DataPoint> byReason = mongoTemplate
                .aggregate(reasonAgg, Report.class, ReportStatisticsResponse.DataPoint.class)
                .getMappedResults();

        // 3. Group By Target Type
        Aggregation targetTypeAgg = Aggregation.newAggregation(
                Aggregation.group("targetType").count().as("value"),
                Aggregation.project("value").and("name").previousOperation(),
                Aggregation.sort(Sort.Direction.DESC, "value")
        );
        List<ReportStatisticsResponse.DataPoint> byTargetType = mongoTemplate
                .aggregate(targetTypeAgg, Report.class, ReportStatisticsResponse.DataPoint.class)
                .getMappedResults();

        // 4. Top Offenders (Pending Only)
        Aggregation topOffendersAgg = Aggregation.newAggregation(
                Aggregation.match(Criteria.where("status").is(ReportStatus.PENDING)),
                Aggregation.group("targetId")
                        .count().as("pendingCount")
                        .first("targetName").as("targetName")
                        .first("targetType").as("targetType"),
                Aggregation.sort(Sort.Direction.DESC, "pendingCount"),
                Aggregation.limit(5),
                Aggregation.project("pendingCount", "targetName", "targetType").and("targetId").previousOperation()
        );
        List<ReportStatisticsResponse.OffenderInfo> topOffenders = mongoTemplate
                .aggregate(topOffendersAgg, Report.class, ReportStatisticsResponse.OffenderInfo.class)
                .getMappedResults();

        return ReportStatisticsResponse.builder()
                .overview(ReportStatisticsResponse.Overview.builder()
                        .totalPending(totalPending)
                        .resolvedToday(resolvedToday)
                        .totalBanned(totalBanned)
                        .build())
                .byReason(byReason)
                .byTargetType(byTargetType)
                .topOffenders(topOffenders)
                .build();
    }

    private void publishBanEvent(Report report, String targetName, String leaderId) {
        try {
            UserBannedEvent event = UserBannedEvent.builder()
                    .targetId(report.getTargetId())
                    .targetType(report.getTargetType().name())
                    .targetName(targetName)
                    .adminNotes(report.getAdminNotes())
                    .reason(report.getReason() != null ? report.getReason().name() : "Không có lý do")
                    .resolvedBy(report.getResolvedBy())
                    .leaderId(leaderId)
                    .timestamp(LocalDateTime.now())
                    .build();

            rabbitTemplate.convertAndSend(RabbitMQConfig.EXCHANGE_NAME, RabbitMQConfig.ROUTING_KEY_USER_BANNED, event);
            log.info("Published USER_BANNED_EVENT for TargetId: {}, LeaderId: {}", report.getTargetId(), leaderId);
        } catch (Exception e) {
            log.error("Failed to publish BANNED event for TargetId: {}", report.getTargetId(), e);
        }
    }

    private void publishWarnEvent(Report report, String targetName, String leaderId) {
        try {
            UserWarnedEvent event = UserWarnedEvent.builder()
                    .targetId(report.getTargetId())
                    .targetType(report.getTargetType().name())
                    .targetName(targetName)
                    .adminNotes(report.getAdminNotes())
                    .reason(report.getReason() != null ? report.getReason().name() : "Không có lý do")
                    .resolvedBy(report.getResolvedBy())
                    .leaderId(leaderId)
                    .timestamp(LocalDateTime.now())
                    .build();

            rabbitTemplate.convertAndSend(RabbitMQConfig.EXCHANGE_NAME, RabbitMQConfig.ROUTING_KEY_USER_WARNED, event);
            log.info("Published USER_WARNED_EVENT for TargetId: {}, LeaderId: {}", report.getTargetId(), leaderId);
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
                .targetName(report.getTargetName())
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

    private String fetchGroupNameSafe(String groupId) {
        if (groupId == null || groupId.isBlank()) {
            return "Nhóm không xác định";
        }
        try {
            GroupResponse response = groupClient.getGroupById(groupId);
            if (response != null && response.getData() != null) {
                return response.getData().getName();
            }
        } catch (Exception e) {
            log.error("Unexpected error fetching group name for {}: {}", groupId, e.getMessage());
        }
        return "Nhóm " + groupId;
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
