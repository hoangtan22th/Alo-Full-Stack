package edu.iuh.fit.report_service.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "reports")
public class Report {

    @Id
    private String id;

    @Indexed
    @Field("reporter_id")
    private String reporterId;

    @Indexed
    @Field("target_id")
    private String targetId;

    @Field("target_type")
    private TargetType targetType;

    @Field("target_name")
    private String targetName;

    @Field("reason")
    private ReportReason reason;

    @Field("description")
    private String description;

    @Field("image_urls")
    private List<String> imageUrls;

    @Field("message_ids")
    private List<String> messageIds;

    @Indexed
    @Builder.Default
    @Field("status")
    private ReportStatus status = ReportStatus.PENDING;

    @Field("admin_notes")
    private String adminNotes;

    @Field("resolved_by")
    private String resolvedBy;

    @CreatedDate
    @Field("created_at")
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Field("updated_at")
    private LocalDateTime updatedAt;
}
