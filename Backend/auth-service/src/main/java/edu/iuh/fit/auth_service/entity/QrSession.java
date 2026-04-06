package edu.iuh.fit.auth_service.entity;

import edu.iuh.fit.auth_service.enums.QrAuthStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "qr_sessions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class QrSession {
    @Id
    private String qrToken;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private QrAuthStatus status;

    // Sẽ được cập nhật khi quét thành công
    private String userId;
    private String deviceId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;
}
