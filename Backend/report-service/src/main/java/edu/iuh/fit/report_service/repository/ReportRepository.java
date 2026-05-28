package edu.iuh.fit.report_service.repository;

import edu.iuh.fit.report_service.entity.Report;
import edu.iuh.fit.report_service.entity.ReportStatus;
import edu.iuh.fit.report_service.entity.ReportReason;
import edu.iuh.fit.report_service.dto.request.AdminActionRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.time.LocalDateTime;

@Repository
public interface ReportRepository extends MongoRepository<Report, String> {
    Page<Report> findByStatus(ReportStatus status, Pageable pageable);
    Page<Report> findByReporterId(String reporterId, Pageable pageable);
    Page<Report> findByTargetId(String targetId, Pageable pageable);
    List<Report> findByTargetIdAndStatus(String targetId, ReportStatus status);
    List<Report> findByTargetIdAndStatusAndReason(String targetId, ReportStatus status, ReportReason reason);

    long countByStatus(ReportStatus status);
    long countByStatusInAndUpdatedAtAfter(List<ReportStatus> statuses, LocalDateTime date);
    long countByResolvedAction(AdminActionRequest.AdminAction action);
}
