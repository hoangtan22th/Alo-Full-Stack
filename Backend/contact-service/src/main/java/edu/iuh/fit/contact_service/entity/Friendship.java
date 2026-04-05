package edu.iuh.fit.contact_service.entity;


import edu.iuh.fit.contact_service.enums.FriendshipStatus;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "friendships")
@Data
public class Friendship {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "requester_id", nullable = false)
    private String requesterId;

    @Column(name = "recipient_id", nullable = false)
    private String recipientId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private FriendshipStatus status;

    @Column(name = "greeting_message")
    private String greetingMessage;

    @CreationTimestamp // Tự động lấy giờ hệ thống lúc Insert
    @Column(name = "create_at", updatable = false)
    private LocalDateTime createAt;

    @UpdateTimestamp // Tự động cập nhật giờ hệ thống lúc Update
    @Column(name = "update_at")
    private LocalDateTime updateAt;
}