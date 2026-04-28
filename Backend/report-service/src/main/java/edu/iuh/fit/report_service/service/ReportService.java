package edu.iuh.fit.report_service.service;

import edu.iuh.fit.report_service.dto.request.AdminActionRequest;
import edu.iuh.fit.report_service.dto.request.ReportCreationRequest;
import edu.iuh.fit.report_service.dto.response.ReportAdminResponse;
import edu.iuh.fit.report_service.dto.response.ReportResponse;
import edu.iuh.fit.report_service.entity.ReportReason;
import edu.iuh.fit.report_service.entity.ReportStatus;
import edu.iuh.fit.report_service.entity.TargetType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface ReportService {
    ReportResponse createReport(ReportCreationRequest request);

    Page<ReportAdminResponse> getAdminReports(ReportStatus status, String targetName, TargetType targetType, ReportReason reason, Pageable pageable);

    ReportAdminResponse resolveReport(String reportId, AdminActionRequest actionRequest);
}
