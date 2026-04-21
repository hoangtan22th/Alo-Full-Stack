package edu.iuh.fit.service;

import edu.iuh.fit.config.RabbitMQConfig;
import edu.iuh.fit.dto.UserBannedEvent;
import edu.iuh.fit.dto.UserUnbannedEvent;
import edu.iuh.fit.dto.UserUpdatedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class RabbitMQPublisher {

    private final RabbitTemplate rabbitTemplate;

    public void publishUserUpdatedEvent(String userId, String phoneNumber) {
        UserUpdatedEvent event = UserUpdatedEvent.builder()
                .id(userId)
                .phoneNumber(phoneNumber)
                .build();

        rabbitTemplate.convertAndSend(
                RabbitMQConfig.EXCHANGE_NAME,
                RabbitMQConfig.ROUTING_KEY_UPDATE,
                event
        );
        log.info("Published UserUpdatedEvent for userID: {}", userId);
    }

    public void publishUserBannedEvent(String userId, String adminNotes) {
        // Vẫn giữ lại event update để các service quan tâm đến Profile cập nhật giao diện
        UserUpdatedEvent updateEvent = UserUpdatedEvent.builder()
                .id(userId)
                .status("BANNED")
                .build();
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.EXCHANGE_NAME,
                RabbitMQConfig.ROUTING_KEY_UPDATE,
                updateEvent
        );

        // Bắn event chuyên biệt cho hành động Ban (xử lý lock login và kick socket)
        UserBannedEvent banEvent = UserBannedEvent.builder()
                .targetId(userId)
                .adminNotes(adminNotes != null ? adminNotes : "Banned by Admin from User Management")
                .resolvedBy("ADMIN")
                .timestamp(LocalDateTime.now())
                .build();
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.EXCHANGE_ADMIN,
                RabbitMQConfig.ROUTING_KEY_USER_BANNED,
                banEvent
        );
        log.info("Published UserBannedEvent to admin.exchange for userID: {}", userId);
    }

    public void publishUserUnbannedEvent(String userId) {
        UserUpdatedEvent updateEvent = UserUpdatedEvent.builder()
                .id(userId)
                .status("ACTIVE")
                .build();
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.EXCHANGE_NAME,
                RabbitMQConfig.ROUTING_KEY_UPDATE,
                updateEvent
        );
        
        UserUnbannedEvent unbanEvent = UserUnbannedEvent.builder()
                .targetId(userId)
                .adminNotes("Unbanned by Admin from User Management")
                .resolvedBy("ADMIN")
                .timestamp(LocalDateTime.now())
                .build();
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.EXCHANGE_ADMIN,
                RabbitMQConfig.ROUTING_KEY_USER_UNBANNED,
                unbanEvent
        );
        log.info("Published UserUnbannedEvent to admin.exchange for userID: {}", userId);
    }
}
