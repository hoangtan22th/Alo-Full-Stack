package edu.iuh.fit.report_service.controller;

import edu.iuh.fit.common_service.dto.response.ApiResponse;
import edu.iuh.fit.report_service.dto.request.ReportCreationRequest;
import edu.iuh.fit.report_service.dto.response.ReportResponse;
import edu.iuh.fit.report_service.entity.ConversationType;
import edu.iuh.fit.report_service.entity.ReportReason;
import edu.iuh.fit.report_service.entity.TargetType;
import edu.iuh.fit.report_service.service.ReportService;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class ReportControllerTest {

    @Mock
    private ReportService reportService;

    @InjectMocks
    private ReportController reportController;

    private Validator validator;
    private ReportCreationRequest validRequest;

    @BeforeEach
    void setUp() {
        try (ValidatorFactory factory = Validation.buildDefaultValidatorFactory()) {
            validator = factory.getValidator();
        }

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

    @Test
    void test_UTCID01_createReport_ValidRequest_ShouldReturnCreated() {
        ReportResponse mockResponse = ReportResponse.builder()
                .id("report123")
                .build();
        when(reportService.createReport(validRequest)).thenReturn(mockResponse);

        ResponseEntity<ApiResponse<ReportResponse>> response = reportController.createReport(validRequest);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("report123", response.getBody().getData().getId());
        verify(reportService, times(1)).createReport(validRequest);
    }

    // Validation Tests (UTCID02 - UTCID20)

    // UTCID01: Happy Path / Valid payload
    @Test
    void test_UTCID01_testValidation_ValidRequest_ShouldHaveNoViolations() {
        Set<ConstraintViolation<ReportCreationRequest>> violations = validator.validate(validRequest);
        assertTrue(violations.isEmpty(), "UTCID01 failed: Expected no violations for valid request");
    }

    // UTCID02: reporterId empty
    @Test
    void test_UTCID02_testValidation_EmptyReporterId_ShouldHaveViolations() {
        validRequest.setReporterId("");
        Set<ConstraintViolation<ReportCreationRequest>> violations = validator.validate(validRequest);
        assertFalse(violations.isEmpty(), "UTCID02 failed: Expected violations for empty reporterId");
    }

    // UTCID03: reporterId 35 chars
    @Test
    void test_UTCID03_testValidation_ReporterId35Chars_ShouldHaveViolations() {
        validRequest.setReporterId("12345678901234567890123456789012345");
        Set<ConstraintViolation<ReportCreationRequest>> violations = validator.validate(validRequest);
        assertFalse(violations.isEmpty(), "UTCID03 failed: Expected violations for 35 chars reporterId");
    }

    // UTCID04: reporterId 37 chars
    @Test
    void test_UTCID04_testValidation_ReporterId37Chars_ShouldHaveViolations() {
        validRequest.setReporterId("1234567890123456789012345678901234567");
        Set<ConstraintViolation<ReportCreationRequest>> violations = validator.validate(validRequest);
        assertFalse(violations.isEmpty(), "UTCID04 failed: Expected violations for 37 chars reporterId");
    }

    // UTCID05: targetId empty
    @Test
    void test_UTCID05_testValidation_EmptyTargetId_ShouldHaveViolations() {
        validRequest.setTargetId("");
        Set<ConstraintViolation<ReportCreationRequest>> violations = validator.validate(validRequest);
        assertFalse(violations.isEmpty(), "UTCID05 failed: Expected violations for empty targetId");
    }

    @Test
    void test_UTCID06_testValidation_TargetId35Chars_ShouldHaveViolations() {
        validRequest.setTargetId("12345678901234567890123456789012345");
        Set<ConstraintViolation<ReportCreationRequest>> violations = validator.validate(validRequest);
        assertFalse(violations.isEmpty(), "UTCID06 failed: Expected violations for 35 chars targetId");
    }

    // UTCID07: targetId 37 chars
    @Test
    void test_UTCID07_testValidation_TargetId37Chars_ShouldHaveViolations() {
        validRequest.setTargetId("1234567890123456789012345678901234567");
        Set<ConstraintViolation<ReportCreationRequest>> violations = validator.validate(validRequest);
        assertFalse(violations.isEmpty(), "UTCID07 failed: Expected violations for 37 chars targetId");
    }

    // UTCID08: targetName 1 char (Valid)
    @Test
    void test_UTCID08_testValidation_TargetName1Char_ShouldHaveNoViolations() {
        validRequest.setTargetName("A");
        Set<ConstraintViolation<ReportCreationRequest>> violations = validator.validate(validRequest);
        assertTrue(violations.isEmpty(), "UTCID08 failed: Expected no violations for 1 char targetName");
    }

    // UTCID09: targetName 1000 chars (Valid)
    @Test
    void test_UTCID09_testValidation_TargetName1000Chars_ShouldHaveNoViolations() {
        validRequest.setTargetName("A".repeat(1000));
        Set<ConstraintViolation<ReportCreationRequest>> violations = validator.validate(validRequest);
        assertTrue(violations.isEmpty(), "UTCID09 failed: Expected no violations for 1000 chars targetName");
    }

    // UTCID10: targetName 1001 chars (Invalid)
    @Test
    void test_UTCID10_testValidation_TargetName1001Chars_ShouldHaveViolations() {
        validRequest.setTargetName("A".repeat(1001));
        Set<ConstraintViolation<ReportCreationRequest>> violations = validator.validate(validRequest);
        assertFalse(violations.isEmpty(), "UTCID10 failed: Expected violations for 1001 chars targetName");
    }

    // UTCID11: targetType invalid enum value
    @Test
    void test_UTCID11_testValidation_InvalidTargetType_Simulation() {
        // Since enum validation is handled by Jackson during JSON parse, we simulate it via a null or mock logic.
        // Or if handled by standard validation, if the field is null because of parse error, it fails @NotNull
        validRequest.setTargetType(null); // Simulated parse failure
        Set<ConstraintViolation<ReportCreationRequest>> violations = validator.validate(validRequest);
        assertFalse(violations.isEmpty(), "UTCID11 failed: Expected violations for invalid/null targetType");
    }

    // UTCID12: targetType null
    @Test
    void test_UTCID12_testValidation_NullTargetType_ShouldHaveViolations() {
        validRequest.setTargetType(null);
        Set<ConstraintViolation<ReportCreationRequest>> violations = validator.validate(validRequest);
        assertFalse(violations.isEmpty(), "UTCID12 failed: Expected violations for null targetType");
    }

    // UTCID13: conversationType invalid enum value
    @Test
    void test_UTCID13_testValidation_InvalidConversationType_Simulation() {
        validRequest.setConversationType(null); // Simulated parse failure
        Set<ConstraintViolation<ReportCreationRequest>> violations = validator.validate(validRequest);
        assertFalse(violations.isEmpty(), "UTCID13 failed: Expected violations for invalid conversationType");
    }

    // UTCID14: conversationType null
    @Test
    void test_UTCID14_testValidation_NullConversationType_ShouldHaveViolations() {
        validRequest.setConversationType(null);
        Set<ConstraintViolation<ReportCreationRequest>> violations = validator.validate(validRequest);
        assertFalse(violations.isEmpty(), "UTCID14 failed: Expected violations for null conversationType");
    }

    // UTCID15: conversationId empty
    @Test
    void test_UTCID15_testValidation_EmptyConversationId_ShouldHaveViolations() {
        validRequest.setConversationId("");
        Set<ConstraintViolation<ReportCreationRequest>> violations = validator.validate(validRequest);
        assertFalse(violations.isEmpty(), "UTCID15 failed: Expected violations for empty conversationId");
    }

    // UTCID16: conversationId 35 chars
    @Test
    void test_UTCID16_testValidation_ConversationId35Chars_ShouldHaveViolations() {
        validRequest.setConversationId("12345678901234567890123456789012345");
        Set<ConstraintViolation<ReportCreationRequest>> violations = validator.validate(validRequest);
        assertFalse(violations.isEmpty(), "UTCID16 failed: Expected violations for 35 chars conversationId");
    }

    // UTCID17: conversationId 37 chars
    @Test
    void test_UTCID17_testValidation_ConversationId37Chars_ShouldHaveViolations() {
        validRequest.setConversationId("1234567890123456789012345678901234567");
        Set<ConstraintViolation<ReportCreationRequest>> violations = validator.validate(validRequest);
        assertFalse(violations.isEmpty(), "UTCID17 failed: Expected violations for 37 chars conversationId");
    }

    // UTCID18: reason invalid enum value
    @Test
    void test_UTCID18_testValidation_InvalidReason_Simulation() {
        validRequest.setReason(null); // Simulated parse failure
        Set<ConstraintViolation<ReportCreationRequest>> violations = validator.validate(validRequest);
        assertFalse(violations.isEmpty(), "UTCID18 failed: Expected violations for invalid reason");
    }

    // UTCID19: reason null
    @Test
    void test_UTCID19_testValidation_NullReason_ShouldHaveViolations() {
        validRequest.setReason(null);
        Set<ConstraintViolation<ReportCreationRequest>> violations = validator.validate(validRequest);
        assertFalse(violations.isEmpty(), "UTCID19 failed: Expected violations for null reason");
    }

    // UTCID20: description validation when reason is OTHER
    @Test
    void test_UTCID20_testValidation_ReasonOther_EmptyDescription_ShouldHaveViolations() {
        validRequest.setReason(ReportReason.OTHER);
        validRequest.setDescription(""); // Validation on DTO should ideally catch this, or we test empty string limits
        Set<ConstraintViolation<ReportCreationRequest>> violations = validator.validate(validRequest);
        // Note: Unless a custom validator exists, @Size(min=1) will catch empty strings, but null might pass.
        // Based on the updated DTO with @Size(min=1, max=1000), an empty string "" will fail.
        assertFalse(violations.isEmpty(), "UTCID20 failed: Expected violations for empty description when reason is OTHER");
    }
}
