package edu.iuh.fit.auth_service.entity;

import edu.iuh.fit.auth_service.enums.QrAuthStatus;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.redis.core.RedisHash;
import org.springframework.data.redis.core.TimeToLive;

import java.io.Serializable;
import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@RedisHash("QrSession")
public class QrSession implements Serializable {
    @Id
    private String qrToken;

    private QrAuthStatus status;

    // Sẽ được cập nhật khi quét thành công
    private String userId;
    private String deviceId;

    private LocalDateTime createdAt;
    
    // Lưu ý: với Redis ta thường dùng TTL định định thời gian tồn tại thay vì expiresAt để kiểm tra.
    private LocalDateTime expiresAt;

    @TimeToLive
    private Long timeToLive; 
}
