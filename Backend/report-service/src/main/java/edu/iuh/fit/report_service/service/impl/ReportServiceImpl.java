package edu.iuh.fit.report_service.service.impl;

import edu.iuh.fit.common_service.dto.response.ApiResponse;
import edu.iuh.fit.report_service.client.GroupClient;
import edu.iuh.fit.report_service.client.UserClient;
import edu.iuh.fit.report_service.config.RabbitMQConfig;
import edu.iuh.fit.report_service.dto.event.ReportCreatedEvent;
import edu.iuh.fit.report_service.dto.event.ReportResolvedEvent;
import edu.iuh.fit.report_service.dto.event.UserBannedEvent;
import edu.iuh.fit.report_service.dto.event.UserWarnedEvent;
import edu.iuh.fit.report_service.dto.event.GroupDisbandedEvent;
import edu.iuh.fit.report_service.dto.event.GroupWarnedEvent;
import edu.iuh.fit.report_service.dto.event.GroupBannedEvent;
import edu.iuh.fit.report_service.dto.request.AdminActionRequest;
import edu.iuh.fit.report_service.dto.request.ReportCreationRequest;
import edu.iuh.fit.report_service.dto.response.GroupResponse;
import edu.iuh.fit.report_service.dto.response.ReportAdminResponse;
import edu.iuh.fit.report_service.dto.response.ReportResponse;
import edu.iuh.fit.report_service.dto.response.UserResponse;
import edu.iuh.fit.report_service.entity.*;
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
import edu.iuh.fit.report_service.client.MessageServiceClient;
import edu.iuh.fit.report_service.dto.MessageDto;
import edu.iuh.fit.common_service.exception.TamperedEvidenceException;
import org.springframework.data.redis.core.StringRedisTemplate;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.concurrent.TimeUnit;

import java.util.concurrent.ThreadLocalRandom;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportServiceImpl implements ReportService {

    private final ReportRepository reportRepository;
    private final UserClient userClient;
    private final GroupClient groupClient;
    private final MessageServiceClient messageServiceClient;
    private final RabbitTemplate rabbitTemplate;
    private final MongoTemplate mongoTemplate;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    @Override
    public ReportResponse createReport(ReportCreationRequest request) {
        log.info("Creating new report from reporter {} targeting {}", request.getReporterId(), request.getTargetId());

        // 1. Spot-Check Validation (New in V2.1)
        if (request.getMessageSnapshots() != null && !request.getMessageSnapshots().isEmpty()) {
            try {
                List<MessageSnapshot> verifiable = request.getMessageSnapshots();
                int randomIndex = ThreadLocalRandom.current().nextInt(verifiable.size());
                MessageSnapshot sample = verifiable.get(randomIndex);

                try {
                    MessageDto actual = messageServiceClient.getMessageById(sample.getMessageId());
                    if (actual != null && actual.getContent() != null && !actual.getContent().equals(sample.getContent())) {
                        log.warn("Tampered snapshot detected! Reporter: {}, MessageId: {}", request.getReporterId(), sample.getMessageId());
                        throw new TamperedEvidenceException("Nội dung tin nhắn không khớp với hồ sơ máy chủ (Phát hiện giả mạo bằng chứng)");
                    }
                } catch (FeignException.NotFound e) {
                    log.info("Message {} was already revoked/deleted on server, skipping spot-check", sample.getMessageId());
                } catch (FeignException e) {
                    log.error("Feign error during spot-check for message {}: status {}", sample.getMessageId(), e.status());
                    // Allow report to continue even if message-service is unreachable
                }
            } catch (TamperedEvidenceException e) {
                throw e; // Re-throw tampering detection
            } catch (Exception e) {
                log.error("Unexpected error during spot-check: {}", e.getMessage());
                // Allow report to continue on random system errors
            }
        }

        // 2. Fetch target name for persistence and events
        String targetName = request.getTargetName();
        if (targetName == null || targetName.isBlank()) {
            if (request.getTargetType() == TargetType.USER) {
                targetName = fetchUserSafe(request.getTargetId()).getFullName();
            } else if (request.getTargetType() == TargetType.GROUP) {
                targetName = fetchGroupNameSafe(request.getTargetId());
            }
        }

        Report report = Report.builder()
                .reporterId(request.getReporterId())
                .targetId(request.getTargetId())
                .targetType(request.getTargetType())
                .targetName(targetName)
                .conversationType(request.getConversationType())
                .conversationId(request.getConversationId())
                .reason(request.getReason())
                .description(request.getDescription())
                .imageUrls(request.getImageUrls())
                .messageSnapshots(request.getMessageSnapshots())
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
        long count = mongoTemplate.count(query, Report.class);
        query.with(pageable);
        List<Report> reports = mongoTemplate.find(query, Report.class);

        List<ReportAdminResponse> list = reports.stream()
                .map(this::mapToAdminResponse)
                .collect(Collectors.toList());

        return PageableExecutionUtils.getPage(list, pageable, () -> count);
    }

    @Override
    public ReportAdminResponse resolveReport(String reportId, AdminActionRequest actionRequest, String adminId) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new RuntimeException("Report not found with ID: " + reportId));

        report.setAdminNotes(actionRequest.getAdminNotes());
        report.setResolvedBy(adminId);
        report.setResolvedAction(actionRequest.getAction());
        report.setUpdatedAt(LocalDateTime.now());

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

        if (report.getTargetType() == TargetType.USER) {
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
                default:
                    log.warn("Action {} not applicable for USER target", actionRequest.getAction());
                    break;
            }
        } else if (report.getTargetType() == TargetType.GROUP) {
            switch (actionRequest.getAction()) {
                case DISMISS:
                    report.setStatus(ReportStatus.REJECTED);
                    break;
                case WARN:
                    report.setStatus(ReportStatus.RESOLVED);
                    publishGroupWarnEvent(report, targetName);
                    break;
                case BAN:
                    report.setStatus(ReportStatus.RESOLVED);
                    publishGroupBanEvent(report, targetName);
                    break;
                case DISBAND_GROUP:
                    report.setStatus(ReportStatus.RESOLVED);
                    publishDisbandGroupEvent(report, targetName);
                    break;
                default:
                    log.warn("Action {} not applicable for GROUP target", actionRequest.getAction());
                    break;
            }
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

        // AUTO-RESOLVE DUPLICATES
        autoResolveDuplicates(reportId, report, actionRequest);

        return mapToAdminResponse(savedReport);
    }

    private void autoResolveDuplicates(String reportId, Report report, AdminActionRequest actionRequest) {
        try {
            AdminActionRequest.AdminAction action = actionRequest.getAction();
            List<Report> duplicates = null;
            String autoNote;

            if (action == AdminActionRequest.AdminAction.BAN) {
                duplicates = reportRepository.findByTargetIdAndStatus(report.getTargetId(), ReportStatus.PENDING);
                autoNote = "Hệ thống tự động xử lý gộp: Đối tượng đã bị CẤM (BAN) trong báo cáo ID: " + reportId;
            } else if (action == AdminActionRequest.AdminAction.WARN) {
                duplicates = reportRepository.findByTargetIdAndStatusAndReason(report.getTargetId(),
                        ReportStatus.PENDING, report.getReason());
                autoNote = "Hệ thống tự động xử lý gộp: Đối tượng đã nhận CẢNH CÁO cho cùng lý do này trong báo cáo ID: "
                        + reportId;
            } else {
                autoNote = "";
            }

            if (duplicates != null && !duplicates.isEmpty()) {
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
                        dup.setUpdatedAt(LocalDateTime.now());
                    });
                    reportRepository.saveAll(toResolve);
                }
            }
        } catch (Exception e) {
            log.error("Failed to safely auto-resolve duplicate reports: {}", e.getMessage());
        }
    }

    @Override
    public void lockReport(String reportId, String adminId) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new RuntimeException("Report not found"));

        if (report.getStatus() == ReportStatus.IN_PROGRESS && 
            report.getLockedBy() != null && 
            !report.getLockedBy().equals(adminId) && 
            report.getLockedAt() != null && 
            report.getLockedAt().isAfter(LocalDateTime.now().minusMinutes(30))) {
            throw new RuntimeException("Report is currently being reviewed by another admin: " + report.getLockedBy());
        }

        report.setStatus(ReportStatus.IN_PROGRESS);
        report.setLockedBy(adminId);
        report.setLockedAt(LocalDateTime.now());
        reportRepository.save(report);
    }

    @Override
    public void heartbeatLock(String reportId, String adminId) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new RuntimeException("Report not found"));

        if (adminId.equals(report.getLockedBy())) {
            report.setLockedAt(LocalDateTime.now());
            reportRepository.save(report);
        }
    }

    @Override
    public ReportStatisticsResponse getStatistics() {
        String cacheKey = "admin:stats:reports";
        try {
            String cachedData = redisTemplate.opsForValue().get(cacheKey);
            if (cachedData != null) {
                log.info("Returning cached report statistics...");
                return objectMapper.readValue(cachedData, ReportStatisticsResponse.class);
            }
        } catch (Exception e) {
            log.error("Redis cache get error in ReportServiceImpl", e);
        }

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
                Aggregation.project("value").and("_id").as("name"),
                Aggregation.sort(Sort.Direction.DESC, "value")
        );
        List<ReportStatisticsResponse.DataPoint> byReason = mongoTemplate
                .aggregate(reasonAgg, Report.class, ReportStatisticsResponse.DataPoint.class)
                .getMappedResults();

        // 3. Group By Target Type
        Aggregation targetTypeAgg = Aggregation.newAggregation(
                Aggregation.group("targetType").count().as("value"),
                Aggregation.project("value").and("_id").as("name"),
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

        ReportStatisticsResponse statsResponse = ReportStatisticsResponse.builder()
                .overview(ReportStatisticsResponse.Overview.builder()
                        .totalPending(totalPending)
                        .resolvedToday(resolvedToday)
                        .totalBanned(totalBanned)
                        .build())
                .byReason(byReason)
                .byTargetType(byTargetType)
                .topOffenders(topOffenders)
                .build();

        try {
            String jsonStr = objectMapper.writeValueAsString(statsResponse);
            redisTemplate.opsForValue().set(cacheKey, jsonStr, 300, TimeUnit.SECONDS);
        } catch (Exception e) {
            log.error("Redis cache set error in ReportServiceImpl", e);
        }

        return statsResponse;
    }

    private void publishBanEvent(Report report, String targetName, String leaderId) {
        try {
            UserBannedEvent.UserBannedEventBuilder eventBuilder = UserBannedEvent.builder()
                    .targetId(report.getTargetId())
                    .targetType(report.getTargetType().name())
                    .targetName(targetName)
                    .adminNotes(report.getAdminNotes())
                    .reason(report.getReason() != null ? report.getReason().name() : "Không có lý do")
                    .resolvedBy(report.getResolvedBy())
                    .leaderId(leaderId)
                    .timestamp(LocalDateTime.now());

            if (report.getConversationType() == ConversationType.GROUP) {
                eventBuilder.groupId(report.getConversationId());
                eventBuilder.groupName("Nhóm");
            }

            UserBannedEvent event = eventBuilder.build();

            rabbitTemplate.convertAndSend(RabbitMQConfig.EXCHANGE_NAME, RabbitMQConfig.ROUTING_KEY_USER_BANNED, event);
            log.info("Published USER_BANNED_EVENT for TargetId: {}, LeaderId: {}, GroupId: {}", report.getTargetId(), leaderId, event.getGroupId());
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

    private void publishDisbandGroupEvent(Report report, String targetName) {
        try {
            GroupDisbandedEvent event = GroupDisbandedEvent.builder()
                    .groupId(report.getTargetId())
                    .groupName(targetName)
                    .adminNotes(report.getAdminNotes())
                    .resolvedBy(report.getResolvedBy())
                    .timestamp(LocalDateTime.now())
                    .build();

            rabbitTemplate.convertAndSend(RabbitMQConfig.EXCHANGE_NAME, RabbitMQConfig.ROUTING_KEY_GROUP_DISBANDED, event);
            log.info("Published GROUP_DISBANDED_EVENT for GroupId: {}", report.getTargetId());
        } catch (Exception e) {
            log.error("Failed to publish DISBAND_GROUP event for GroupId: {}", report.getTargetId(), e);
        }
    }

    private void publishGroupWarnEvent(Report report, String targetName) {
        try {
            GroupWarnedEvent event = GroupWarnedEvent.builder()
                    .groupId(report.getTargetId())
                    .groupName(targetName)
                    .adminNotes(report.getAdminNotes())
                    .resolvedBy(report.getResolvedBy())
                    .reason(report.getReason() != null ? report.getReason().name() : "Không có lý do")
                    .timestamp(LocalDateTime.now())
                    .build();

            rabbitTemplate.convertAndSend(RabbitMQConfig.EXCHANGE_NAME, RabbitMQConfig.ROUTING_KEY_GROUP_WARNED, event);
            log.info("Published GROUP_WARNED_EVENT for GroupId: {}", report.getTargetId());
        } catch (Exception e) {
            log.error("Failed to publish GROUP_WARNED event for GroupId: {}", report.getTargetId(), e);
        }
    }

    private void publishGroupBanEvent(Report report, String targetName) {
        try {
            GroupBannedEvent event = GroupBannedEvent.builder()
                    .groupId(report.getTargetId())
                    .groupName(targetName)
                    .adminNotes(report.getAdminNotes())
                    .resolvedBy(report.getResolvedBy())
                    .reason(report.getReason() != null ? report.getReason().name() : "Không có lý do")
                    .timestamp(LocalDateTime.now())
                    .build();

            rabbitTemplate.convertAndSend(RabbitMQConfig.EXCHANGE_NAME, RabbitMQConfig.ROUTING_KEY_GROUP_BANNED, event);
            log.info("Published GROUP_BANNED_EVENT for GroupId: {}", report.getTargetId());
        } catch (Exception e) {
            log.error("Failed to publish GROUP_BANNED event for GroupId: {}", report.getTargetId(), e);
        }
    }

    private ReportAdminResponse mapToAdminResponse(Report report) {

        // Fetch reporter info
        UserResponse reporter = fetchUserSafe(report.getReporterId());

        // Fetch target info ONLY if targetType is USER
        UserResponse targetUser = null;
        GroupResponse.GroupData targetGroup = null;
        if (report.getTargetType() == TargetType.USER) {
            targetUser = fetchUserSafe(report.getTargetId());
        } else if (report.getTargetType() == TargetType.GROUP) {
            try {
                GroupResponse gRes = groupClient.getGroupById(report.getTargetId());
                if (gRes != null) {
                    targetGroup = gRes.getData();
                }
            } catch (Exception e) {
                log.error("Failed to fetch target group info for {}: {}", report.getTargetId(), e.getMessage());
            }
        }

        return ReportAdminResponse.builder()
                .id(report.getId())
                .reporter(reporter)
                .targetId(report.getTargetId())
                .targetName(report.getTargetName())
                .targetUser(targetUser)
                .targetGroup(targetGroup)
                .targetType(report.getTargetType())
                .reason(report.getReason())
                .status(report.getStatus())
                .conversationType(report.getConversationType())
                .conversationId(report.getConversationId())
                .description(report.getDescription())
                .imageUrls(report.getImageUrls())
                .messageSnapshots(report.getMessageSnapshots())
                .adminNotes(report.getAdminNotes())
                .resolvedBy(report.getResolvedBy())
                .lockedBy(report.getLockedBy())
                .lockedAt(report.getLockedAt())
                .createdAt(report.getCreatedAt())
                .updatedAt(report.getUpdatedAt())
                .snapshotHash(report.getSnapshotHash())
                .aiSummary(report.getAiSummary())
                .aiSuggestedAction(report.getAiSuggestedAction())
                .aiConfidence(report.getAiConfidence())
                .aiAnalyzedAt(report.getAiAnalyzedAt())
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
        if (userId.equalsIgnoreCase("SYSTEM")) {
            return UserResponse.builder()
                    .id("SYSTEM")
                    .fullName("Hệ thống AI")
                    .firstName("Hệ thống")
                    .lastName("AI")
                    .avatar(null)
                    .build();
        }
        try {
            ApiResponse<UserResponse> response = userClient.getUserById(userId);
            if (response != null && response.getData() != null) {
                return response.getData();
            }
        } catch (FeignException.NotFound e) {
            log.warn("User not found for ID: {} (404 from user-service)", userId);
        } catch (FeignException e) {
            log.error("Feign error fetching user {} — message: {}", userId, e.getMessage());
        } catch (Exception e) {
            log.error("Unexpected error fetching user {}: {}", userId, e.getMessage());
        }
        return UserResponse.builder().id(userId).fullName("Unknown User").build();
    }

    @Override
    public long countTargetViolations(String targetId) {
        return reportRepository.countByTargetIdAndStatus(targetId, ReportStatus.RESOLVED);
    }
}
