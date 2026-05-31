package edu.iuh.fit.report_service.controller;

import edu.iuh.fit.common_service.dto.response.ApiResponse;
import edu.iuh.fit.report_service.dto.request.AdminActionRequest;
import edu.iuh.fit.report_service.dto.response.ReportAdminResponse;
import edu.iuh.fit.report_service.dto.response.ReportStatisticsResponse;
import edu.iuh.fit.report_service.entity.ReportReason;
import edu.iuh.fit.report_service.entity.ReportStatus;
import edu.iuh.fit.report_service.entity.TargetType;
import edu.iuh.fit.report_service.service.ReportService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/reports")
@RequiredArgsConstructor
@Validated
public class AdminReportController {

    private final ReportService reportService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<ReportAdminResponse>>> getReports(
            @RequestParam(required = false) ReportStatus status,
            @RequestParam(required = false) String targetName,
            @RequestParam(required = false) TargetType targetType,
            @RequestParam(required = false) ReportReason reason,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<ReportAdminResponse> reports = reportService.getAdminReports(status, targetName, targetType, reason, pageable);

        return ResponseEntity.ok(ApiResponse.success(reports));
    }

    @RequestMapping(value = "/{reportId}/action", method = {RequestMethod.PATCH, RequestMethod.PUT})
    public ResponseEntity<ApiResponse<ReportAdminResponse>> resolveReport(
            @PathVariable @Size(min = 36, max = 36, message = "Report ID must be exactly 36 characters") String reportId,
            @RequestHeader("X-Admin-Id") @Size(min = 36, max = 36, message = "Admin ID must be exactly 36 characters") String adminId,
            @Valid @RequestBody AdminActionRequest actionRequest) {

        ReportAdminResponse response = reportService.resolveReport(reportId, actionRequest, adminId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PatchMapping("/{reportId}/lock")
    public ResponseEntity<ApiResponse<Void>> lockReport(
            @PathVariable String reportId,
            @RequestHeader("X-Admin-Id") String adminId) {
        
        reportService.lockReport(reportId, adminId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PatchMapping("/{reportId}/heartbeat")
    public ResponseEntity<ApiResponse<Void>> heartbeatLock(
            @PathVariable String reportId,
            @RequestHeader("X-Admin-Id") String adminId) {
        
        reportService.heartbeatLock(reportId, adminId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @GetMapping("/statistics")
    public ResponseEntity<ApiResponse<ReportStatisticsResponse>> getStatistics() {
        ReportStatisticsResponse statistics = reportService.getStatistics();
        return ResponseEntity.ok(ApiResponse.success(statistics));
    }

    @GetMapping("/count/violations")
    public ResponseEntity<ApiResponse<Long>> countViolations(@RequestParam String targetId) {
        long count = reportService.countTargetViolations(targetId);
        return ResponseEntity.ok(ApiResponse.success(count));
    }

    @PostMapping("/{reportId}/ai-reanalyze")
    public ResponseEntity<ApiResponse<ReportAdminResponse>> reanalyzeReport(@PathVariable String reportId) {
        ReportAdminResponse response = reportService.reanalyzeReport(reportId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
