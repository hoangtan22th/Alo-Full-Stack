package edu.iuh.fit.report_service.service.impl;

import edu.iuh.fit.common_service.dto.response.ApiResponse;
import edu.iuh.fit.common_service.exception.TamperedEvidenceException;
import edu.iuh.fit.report_service.client.GroupClient;
import edu.iuh.fit.report_service.client.MessageServiceClient;
import edu.iuh.fit.report_service.client.UserClient;
import edu.iuh.fit.report_service.dto.MessageDto;
import edu.iuh.fit.report_service.dto.request.ReportCreationRequest;
import edu.iuh.fit.report_service.dto.response.ReportResponse;
import edu.iuh.fit.report_service.dto.response.UserResponse;
import edu.iuh.fit.report_service.entity.ConversationType;
import edu.iuh.fit.report_service.entity.MessageSnapshot;
import edu.iuh.fit.report_service.entity.Report;
import edu.iuh.fit.report_service.entity.ReportReason;
import edu.iuh.fit.report_service.entity.ReportStatus;
import edu.iuh.fit.report_service.entity.TargetType;
import edu.iuh.fit.report_service.repository.ReportRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.redis.core.StringRedisTemplate;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class ReportServiceImplTest {

    @Mock
    private ReportRepository reportRepository;

    @Mock
    private UserClient userClient;

    @Mock
    private GroupClient groupClient;

    @Mock
    private MessageServiceClient messageServiceClient;

    @Mock
    private RabbitTemplate rabbitTemplate;

    @Mock
    private MongoTemplate mongoTemplate;

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private ReportServiceImpl reportService;

    private ReportCreationRequest validRequest;

    @BeforeEach
    void setUp() {
        validRequest = ReportCreationRequest.builder()
                .reporterId("123456789012345678901234567890123456")
                .targetId("123456789012345678901234567890123456")
                .targetType(TargetType.USER)
                .targetName("Nguyen Van A")
                .conversationType(ConversationType.ONE_TO_ONE)
                .conversationId("123456789012345678901234567890123456")
                .reason(ReportReason.SCAM_FRAUD)
                .description("Test description")
                .build();
    }

    // UTCID01: Happy Path
    @Test
    void test_UTCID01_createReport_ValidRequest_ShouldCreateSuccessfully() {
        Report savedReport = Report.builder()
                .id("report123")
                .reporterId(validRequest.getReporterId())
                .targetId(validRequest.getTargetId())
                .targetType(validRequest.getTargetType())
                .reason(validRequest.getReason())
                .status(ReportStatus.PENDING)
                .build();

        when(reportRepository.save(any(Report.class))).thenReturn(savedReport);

        ReportResponse response = reportService.createReport(validRequest);

        assertNotNull(response);
        assertEquals("report123", response.getId());
        verify(reportRepository, times(1)).save(any(Report.class));
        verify(rabbitTemplate, times(1)).convertAndSend(anyString(), anyString(), any(Object.class));
    }

    // Test Auto Fetch User Target Name
    @Test
    void createReport_EmptyTargetName_ShouldFetchUserFullName() {
        validRequest.setTargetName("");
        validRequest.setTargetType(TargetType.USER);

        UserResponse mockUserResponse = UserResponse.builder()
                .id(validRequest.getTargetId())
                .fullName("Fetched User Name")
                .build();
        
        when(userClient.getUserById(validRequest.getTargetId()))
                .thenReturn(ApiResponse.success(mockUserResponse));
                
        Report savedReport = Report.builder()
                .id("report123")
                .targetName("Fetched User Name")
                .targetType(TargetType.USER)
                .reason(ReportReason.SCAM_FRAUD)
                .build();
                
        when(reportRepository.save(any(Report.class))).thenReturn(savedReport);

        reportService.createReport(validRequest);

        verify(userClient, times(1)).getUserById(validRequest.getTargetId());
        verify(reportRepository, times(1)).save(argThat(report -> "Fetched User Name".equals(report.getTargetName())));
    }

    // UTCID21: Spot-Check Validation - Tampered Evidence
    @Test
    void test_UTCID21_createReport_TamperedMessageSnapshot_ShouldThrowException() {
        MessageSnapshot snapshot = new MessageSnapshot();
        snapshot.setMessageId("msg123");
        snapshot.setContent("Fake Content");
        
        validRequest.setMessageSnapshots(List.of(snapshot));

        MessageDto realMessage = new MessageDto();
        realMessage.setId("msg123");
        realMessage.setContent("Real Content");

        when(messageServiceClient.getMessageById("msg123")).thenReturn(realMessage);

        assertThrows(TamperedEvidenceException.class, () -> reportService.createReport(validRequest));

        verify(reportRepository, never()).save(any(Report.class));
    }

    // UTCID21: Spot-Check Validation - Valid Evidence
    @Test
    void test_UTCID21_createReport_ValidMessageSnapshot_ShouldPass() {
        MessageSnapshot snapshot = new MessageSnapshot();
        snapshot.setMessageId("msg123");
        snapshot.setContent("Real Content");
        
        validRequest.setMessageSnapshots(List.of(snapshot));

        MessageDto realMessage = new MessageDto();
        realMessage.setId("msg123");
        realMessage.setContent("Real Content");

        when(messageServiceClient.getMessageById("msg123")).thenReturn(realMessage);

        Report savedReport = Report.builder()
                .id("report123")
                .targetType(TargetType.USER)
                .reason(ReportReason.SCAM_FRAUD)
                .build();

        when(reportRepository.save(any(Report.class))).thenReturn(savedReport);

        assertDoesNotThrow(() -> reportService.createReport(validRequest));

        verify(reportRepository, times(1)).save(any(Report.class));
    }
    // -------------------------------------------------------------
    // resolveReport Tests (UT KiemDuyetVaXuLyViPham)
    // -------------------------------------------------------------

    // TC_09: Report ID không tồn tại
    @Test
    void test_TC09_resolveReport_ReportNotFound_ShouldThrowException() {
        edu.iuh.fit.report_service.dto.request.AdminActionRequest actionRequest = edu.iuh.fit.report_service.dto.request.AdminActionRequest.builder()
                .action(edu.iuh.fit.report_service.dto.request.AdminActionRequest.AdminAction.WARN)
                .adminNotes("Test note")
                .build();
        when(reportRepository.findById("invalid-id")).thenReturn(java.util.Optional.empty());

        assertThrows(RuntimeException.class, () -> reportService.resolveReport("invalid-id", actionRequest, "admin1"));
    }

    // TC_01: Test valid VP (User - Dismiss)
    @Test
    void test_TC01_resolveReport_UserDismiss_ShouldReject() {
        Report report = new Report();
        report.setId("report1");
        report.setReporterId("reporter1");
        report.setTargetType(TargetType.USER);
        report.setTargetId("user1");
        report.setTargetName("Nguyễn Văn A");

        edu.iuh.fit.report_service.dto.request.AdminActionRequest actionRequest = edu.iuh.fit.report_service.dto.request.AdminActionRequest.builder()
                .action(edu.iuh.fit.report_service.dto.request.AdminActionRequest.AdminAction.DISMISS)
                .adminNotes("Test note")
                .targetName("Nguyễn Văn A")
                .build();

        when(reportRepository.findById("report1")).thenReturn(java.util.Optional.of(report));
        when(reportRepository.save(any(Report.class))).thenAnswer(i -> i.getArguments()[0]);

        edu.iuh.fit.report_service.dto.response.ReportAdminResponse response = reportService.resolveReport("report1", actionRequest, "admin1");

        assertEquals(ReportStatus.REJECTED, response.getStatus());
        verify(rabbitTemplate, never()).convertAndSend(eq(edu.iuh.fit.report_service.config.RabbitMQConfig.EXCHANGE_NAME), eq(edu.iuh.fit.report_service.config.RabbitMQConfig.ROUTING_KEY_USER_WARNED), any(Object.class));
        verify(rabbitTemplate, never()).convertAndSend(eq(edu.iuh.fit.report_service.config.RabbitMQConfig.EXCHANGE_NAME), eq(edu.iuh.fit.report_service.config.RabbitMQConfig.ROUTING_KEY_USER_BANNED), any(Object.class));
    }

    // TC_02: Test valid VP (User - Warn)
    @Test
    void test_TC02_resolveReport_UserWarn_ShouldResolveAndPublishEvent() {
        Report report = new Report();
        report.setId("report1");
        report.setTargetType(TargetType.USER);
        report.setTargetId("user1");
        report.setTargetName("Nguyễn Văn A");

        edu.iuh.fit.report_service.dto.request.AdminActionRequest actionRequest = edu.iuh.fit.report_service.dto.request.AdminActionRequest.builder()
                .action(edu.iuh.fit.report_service.dto.request.AdminActionRequest.AdminAction.WARN)
                .adminNotes("Test note")
                .targetName("Nguyễn Văn A")
                .build();

        when(reportRepository.findById("report1")).thenReturn(java.util.Optional.of(report));
        when(reportRepository.save(any(Report.class))).thenAnswer(i -> i.getArguments()[0]);

        edu.iuh.fit.report_service.dto.response.ReportAdminResponse response = reportService.resolveReport("report1", actionRequest, "admin1");

        assertEquals(ReportStatus.RESOLVED, response.getStatus());
        verify(rabbitTemplate, times(1)).convertAndSend(eq(edu.iuh.fit.report_service.config.RabbitMQConfig.EXCHANGE_NAME), eq(edu.iuh.fit.report_service.config.RabbitMQConfig.ROUTING_KEY_USER_WARNED), any(Object.class));
    }

    // TC_03: Test valid VP (User - Ban)
    @Test
    void test_TC03_resolveReport_UserBan_ShouldResolveAndPublishEvent() {
        Report report = new Report();
        report.setId("report1");
        report.setTargetType(TargetType.USER);
        report.setTargetId("user1");
        report.setTargetName("Nguyễn Văn A");

        edu.iuh.fit.report_service.dto.request.AdminActionRequest actionRequest = edu.iuh.fit.report_service.dto.request.AdminActionRequest.builder()
                .action(edu.iuh.fit.report_service.dto.request.AdminActionRequest.AdminAction.BAN)
                .adminNotes("Test note")
                .targetName("Nguyễn Văn A")
                .build();

        when(reportRepository.findById("report1")).thenReturn(java.util.Optional.of(report));
        when(reportRepository.save(any(Report.class))).thenAnswer(i -> i.getArguments()[0]);

        edu.iuh.fit.report_service.dto.response.ReportAdminResponse response = reportService.resolveReport("report1", actionRequest, "admin1");

        assertEquals(ReportStatus.RESOLVED, response.getStatus());
        verify(rabbitTemplate, times(1)).convertAndSend(eq(edu.iuh.fit.report_service.config.RabbitMQConfig.EXCHANGE_NAME), eq(edu.iuh.fit.report_service.config.RabbitMQConfig.ROUTING_KEY_USER_BANNED), any(Object.class));
    }

    // TC_04: Test valid VP (Group - Warn)
    @Test
    void test_TC04_resolveReport_GroupWarn_ShouldResolveAndPublishEvent() {
        Report report = new Report();
        report.setId("report1");
        report.setTargetType(TargetType.GROUP);
        report.setTargetId("group1");
        report.setTargetName("Nhóm A");

        edu.iuh.fit.report_service.dto.request.AdminActionRequest actionRequest = edu.iuh.fit.report_service.dto.request.AdminActionRequest.builder()
                .action(edu.iuh.fit.report_service.dto.request.AdminActionRequest.AdminAction.WARN)
                .adminNotes("Test note")
                .targetName("Nhóm A")
                .build();

        when(reportRepository.findById("report1")).thenReturn(java.util.Optional.of(report));
        when(reportRepository.save(any(Report.class))).thenAnswer(i -> i.getArguments()[0]);

        edu.iuh.fit.report_service.dto.response.ReportAdminResponse response = reportService.resolveReport("report1", actionRequest, "admin1");

        assertEquals(ReportStatus.RESOLVED, response.getStatus());
        verify(rabbitTemplate, times(1)).convertAndSend(eq(edu.iuh.fit.report_service.config.RabbitMQConfig.EXCHANGE_NAME), eq(edu.iuh.fit.report_service.config.RabbitMQConfig.ROUTING_KEY_GROUP_WARNED), any(Object.class));
    }

    // TC_05: Test valid VP (Group - Ban)
    @Test
    void test_TC05_resolveReport_GroupBan_ShouldResolveAndPublishEvent() {
        Report report = new Report();
        report.setId("report1");
        report.setTargetType(TargetType.GROUP);
        report.setTargetId("group1");
        report.setTargetName("Nhóm A");

        edu.iuh.fit.report_service.dto.request.AdminActionRequest actionRequest = edu.iuh.fit.report_service.dto.request.AdminActionRequest.builder()
                .action(edu.iuh.fit.report_service.dto.request.AdminActionRequest.AdminAction.BAN)
                .adminNotes("Test note")
                .targetName("Nhóm A")
                .build();

        when(reportRepository.findById("report1")).thenReturn(java.util.Optional.of(report));
        when(reportRepository.save(any(Report.class))).thenAnswer(i -> i.getArguments()[0]);

        edu.iuh.fit.report_service.dto.response.ReportAdminResponse response = reportService.resolveReport("report1", actionRequest, "admin1");

        assertEquals(ReportStatus.RESOLVED, response.getStatus());
        verify(rabbitTemplate, times(1)).convertAndSend(eq(edu.iuh.fit.report_service.config.RabbitMQConfig.EXCHANGE_NAME), eq(edu.iuh.fit.report_service.config.RabbitMQConfig.ROUTING_KEY_GROUP_BANNED), any(Object.class));
    }

    // TC_06: Test valid VP (Group - Disband)
    @Test
    void test_TC06_resolveReport_GroupDisband_ShouldResolveAndPublishEvent() {
        Report report = new Report();
        report.setId("report1");
        report.setTargetType(TargetType.GROUP);
        report.setTargetId("group1");
        report.setTargetName("Nhóm A");

        edu.iuh.fit.report_service.dto.request.AdminActionRequest actionRequest = edu.iuh.fit.report_service.dto.request.AdminActionRequest.builder()
                .action(edu.iuh.fit.report_service.dto.request.AdminActionRequest.AdminAction.DISBAND_GROUP)
                .adminNotes("Test note")
                .targetName("Nhóm A")
                .build();

        when(reportRepository.findById("report1")).thenReturn(java.util.Optional.of(report));
        when(reportRepository.save(any(Report.class))).thenAnswer(i -> i.getArguments()[0]);

        edu.iuh.fit.report_service.dto.response.ReportAdminResponse response = reportService.resolveReport("report1", actionRequest, "admin1");

        assertEquals(ReportStatus.RESOLVED, response.getStatus());
        verify(rabbitTemplate, times(1)).convertAndSend(eq(edu.iuh.fit.report_service.config.RabbitMQConfig.EXCHANGE_NAME), eq(edu.iuh.fit.report_service.config.RabbitMQConfig.ROUTING_KEY_GROUP_DISBANDED), any(Object.class));
    }

    // TC_07: Auto-Resolve Duplicate
    @Test
    void test_TC07_resolveReport_AutoResolveDuplicates_ShouldResolveOtherPending() {
        Report report = new Report();
        report.setId("report1");
        report.setTargetType(TargetType.USER);
        report.setTargetId("user1");
        report.setTargetName("Nguyễn Văn A");

        edu.iuh.fit.report_service.dto.request.AdminActionRequest actionRequest = edu.iuh.fit.report_service.dto.request.AdminActionRequest.builder()
                .action(edu.iuh.fit.report_service.dto.request.AdminActionRequest.AdminAction.BAN)
                .adminNotes("Test note")
                .targetName("Nguyễn Văn A")
                .build();

        Report duplicateReport = new Report();
        duplicateReport.setId("report2");
        duplicateReport.setStatus(ReportStatus.PENDING);

        when(reportRepository.findById("report1")).thenReturn(java.util.Optional.of(report));
        when(reportRepository.save(any(Report.class))).thenAnswer(i -> i.getArguments()[0]);
        when(reportRepository.findByTargetIdAndStatus("user1", ReportStatus.PENDING)).thenReturn(List.of(duplicateReport));

        reportService.resolveReport("report1", actionRequest, "admin1");

        assertEquals(ReportStatus.RESOLVED, duplicateReport.getStatus());
        assertTrue(duplicateReport.getAdminNotes().contains("Hệ thống tự động xử lý gộp"));
        verify(reportRepository, times(1)).saveAll(List.of(duplicateReport));
    }

    // TC_08: Fetch targetName if empty
    @Test
    void test_TC08_resolveReport_FetchTargetNameIfEmpty() {
        Report report = new Report();
        report.setId("report1");
        report.setTargetType(TargetType.USER);
        report.setTargetId("user1");
        
        edu.iuh.fit.report_service.dto.request.AdminActionRequest actionRequest = edu.iuh.fit.report_service.dto.request.AdminActionRequest.builder()
                .action(edu.iuh.fit.report_service.dto.request.AdminActionRequest.AdminAction.WARN)
                .adminNotes("Test note")
                // Missing targetName
                .build();

        when(reportRepository.findById("report1")).thenReturn(java.util.Optional.of(report));
        when(reportRepository.save(any(Report.class))).thenAnswer(i -> i.getArguments()[0]);
        
        UserResponse mockUser = UserResponse.builder().fullName("Fetched User").build();
        when(userClient.getUserById("user1")).thenReturn(ApiResponse.success(mockUser));

        edu.iuh.fit.report_service.dto.response.ReportAdminResponse response = reportService.resolveReport("report1", actionRequest, "admin1");

        verify(userClient, atLeast(1)).getUserById("user1");
        // Verify that the event publisher uses the fetched name implicitly (the targetName in response or report is fetched)
    }

    // TC_13: Invalid action for USER (DISBAND_GROUP)
    @Test
    void test_TC13_resolveReport_InvalidActionForUser_ShouldNotChangeStatus() {
        Report report = new Report();
        report.setId("report1");
        report.setStatus(ReportStatus.PENDING); // Initial status
        report.setReporterId("reporter1");
        report.setTargetType(TargetType.USER);
        report.setTargetId("user1");
        report.setTargetName("Nguyễn Văn A");

        edu.iuh.fit.report_service.dto.request.AdminActionRequest actionRequest = edu.iuh.fit.report_service.dto.request.AdminActionRequest.builder()
                .action(edu.iuh.fit.report_service.dto.request.AdminActionRequest.AdminAction.DISBAND_GROUP)
                .adminNotes("Test note")
                .targetName("Nguyễn Văn A")
                .build();

        when(reportRepository.findById("report1")).thenReturn(java.util.Optional.of(report));
        when(reportRepository.save(any(Report.class))).thenAnswer(i -> i.getArguments()[0]);

        edu.iuh.fit.report_service.dto.response.ReportAdminResponse response = reportService.resolveReport("report1", actionRequest, "admin1");

        assertEquals(ReportStatus.PENDING, response.getStatus()); // Status unchanged
        verify(rabbitTemplate, never()).convertAndSend(eq(edu.iuh.fit.report_service.config.RabbitMQConfig.EXCHANGE_NAME), eq(edu.iuh.fit.report_service.config.RabbitMQConfig.ROUTING_KEY_GROUP_DISBANDED), any(Object.class));
    }
}
