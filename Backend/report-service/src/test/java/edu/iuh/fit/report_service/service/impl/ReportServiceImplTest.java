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
}
