package edu.iuh.fit.report_service.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
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
@CompoundIndexes({
    @CompoundIndex(name = "reporter_target_reason_pending_idx", 
                   def = "{'reporter_id': 1, 'target_id': 1, 'reason': 1}", 
                   unique = true, 
                   partialFilter = "{'status': 'PENDING'}")
})
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

    @Field("conversation_type")
    private ConversationType conversationType;

    @Field("conversation_id")
    private String conversationId;

    @Field("reason")
    private ReportReason reason;

    @Field("description")
    private String description;

    @Field("image_urls")
    private List<String> imageUrls;

    @Field("message_snapshots")
    private List<MessageSnapshot> messageSnapshots;

    @Indexed
    @Builder.Default
    @Field("status")
    private ReportStatus status = ReportStatus.PENDING;

    @Field("admin_notes")
    private String adminNotes;

    @Field("resolved_by")
    private String resolvedBy;

    @Field("resolved_action")
    private edu.iuh.fit.report_service.dto.request.AdminActionRequest.AdminAction resolvedAction;

    @Field("locked_by")
    private String lockedBy;

    @Field("locked_at")
    private LocalDateTime lockedAt;

    @CreatedDate
    @Field("created_at")
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Field("updated_at")
    private LocalDateTime updatedAt;
}
