package edu.iuh.fit.auth_service.service;

import edu.iuh.fit.auth_service.config.RabbitMQConfig;
import edu.iuh.fit.auth_service.dto.UserRegisteredEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class RabbitMQPublisher {

    private final RabbitTemplate rabbitTemplate;

    public void publishUserRegisteredEvent(String userId, String email, String fullName, String phoneNumber, String avatar, String cover, Integer gender) {
        UserRegisteredEvent event = UserRegisteredEvent.builder()
                .id(userId)
                .email(email)
                .fullName(fullName)
                .phoneNumber(phoneNumber)
                .avatarUrl(avatar)
                .coverUrl(cover)
                .gender(gender)
                .build();

        rabbitTemplate.convertAndSend(
                RabbitMQConfig.EXCHANGE_NAME,
                RabbitMQConfig.ROUTING_KEY_REGISTRATION,
                event
        );
        log.info("Published UserRegisteredEvent for userID: {}", userId);
    }

    public void publishForceLogoutEvent(String userId, java.util.List<String> killedSessionIds) {
        try {
            java.util.Map<String, Object> payload = new java.util.HashMap<>();
            payload.put("event", "FORCE_LOGOUT");
            payload.put("target", userId); // Gửi đến room user_

            java.util.Map<String, Object> data = new java.util.HashMap<>();
            data.put("message", "Tài khoản của bạn đã được đăng nhập ở một thiết bị khác");
            data.put("killedSessionIds", killedSessionIds); // Những session bị tiêu diệt
            
            payload.put("data", data);

            rabbitTemplate.convertAndSend(RabbitMQConfig.QUEUE_REALTIME_EVENTS, payload);
        } catch (Exception e) {
            System.err.println("❌ Error publishing FORCE_LOGOUT event: " + e.getMessage());
        }
    }
}
