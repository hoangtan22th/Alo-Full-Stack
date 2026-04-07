package edu.iuh.fit.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class User {
    @Id
    private String id;

    @Column(unique = true, nullable = false)
    private String email;

    // password is not returned or processed closely here, but kept to map entity properly
    private String password;
    private String fullName;
    private String phoneNumber;
    private String avatar;
    private String coverImage;
    private Integer gender;

    @Column(name = "date_of_birth")
    private java.time.LocalDate dateOfBirth;

    @Enumerated(EnumType.STRING)
    @Column(name = "auth_provider")
    @Builder.Default
    private AuthProvider authProvider = AuthProvider.LOCAL;

    @Column(name = "is_2fa_enabled")
    @Builder.Default
    private Boolean is2faEnabled = false;

    @Builder.Default
    private Boolean isBanned = false;

    @Builder.Default
    private Boolean isOnline = false;

    private LocalDateTime lastActive;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum AuthProvider { LOCAL, GOOGLE }
}
