package edu.iuh.fit.report_service.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MessageSnapshot {

    @Field("message_id")
    private String messageId;

    @Field("sender_id")
    private String senderId;

    @Field("sender_name")
    private String senderName;

    @Field("sender_avatar")
    private String senderAvatar;

    @Field("content")
    private String content;

    @Field("content_type")
    private String contentType;

    @Field("sent_at")
    private LocalDateTime sentAt;

    @Field("is_anchor")
    @JsonProperty("isAnchor")
    private boolean isAnchor;

    @Field("sequence_index")
    private Integer sequenceIndex;

    @Field("total_messages_in_conversation")
    private Integer totalMessagesInConversation;

    @Field("is_by_reporter")
    @JsonProperty("isByReporter")
    private boolean isByReporter;
}
