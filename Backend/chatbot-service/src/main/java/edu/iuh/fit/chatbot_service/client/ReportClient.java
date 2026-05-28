package edu.iuh.fit.chatbot_service.client;

import edu.iuh.fit.common_service.dto.response.ApiResponse;
import edu.iuh.fit.chatbot_service.dto.ReportCreationRequestDTO;
import edu.iuh.fit.chatbot_service.dto.ReportResponseDTO;
import edu.iuh.fit.chatbot_service.dto.AdminActionRequestDTO;
import edu.iuh.fit.chatbot_service.dto.ReportAdminResponseDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;

@FeignClient(name = "report-service")
public interface ReportClient {

    @PostMapping("/api/v1/reports")
    ApiResponse<ReportResponseDTO> createReport(@RequestBody ReportCreationRequestDTO request);

    @PutMapping("/api/v1/admin/reports/{reportId}/action")
    ApiResponse<ReportAdminResponseDTO> resolveReport(
            @PathVariable("reportId") String reportId,
            @RequestHeader("X-Admin-Id") String adminId,
            @RequestBody AdminActionRequestDTO actionRequest
    );
}
