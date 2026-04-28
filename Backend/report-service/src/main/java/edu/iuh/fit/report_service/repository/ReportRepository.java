package edu.iuh.fit.report_service.repository;

import edu.iuh.fit.report_service.entity.Report;
import edu.iuh.fit.report_service.entity.ReportStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import edu.iuh.fit.report_service.entity.ReportReason;
import java.util.List;

@Repository
public interface ReportRepository extends MongoRepository<Report, String> {
    Page<Report> findByStatus(ReportStatus status, Pageable pageable);
    Page<Report> findByReporterId(String reporterId, Pageable pageable);
    Page<Report> findByTargetId(String targetId, Pageable pageable);
    List<Report> findByTargetIdAndStatus(String targetId, ReportStatus status);
    List<Report> findByTargetIdAndStatusAndReason(String targetId, ReportStatus status, ReportReason reason);
}
