package edu.iuh.fit.service;

import edu.iuh.fit.config.RabbitMQConfig;
import edu.iuh.fit.dto.UserUpdatedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

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

    public void publishUserBannedEvent(String userId) {
        UserUpdatedEvent event = UserUpdatedEvent.builder()
                .id(userId)
                .status("BANNED")
                .build();
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.EXCHANGE_NAME,
                RabbitMQConfig.ROUTING_KEY_UPDATE,
                event
        );
        log.info("Published UserBannedEvent for userID: {}", userId);
    }

    public void publishUserUnbannedEvent(String userId) {
        UserUpdatedEvent event = UserUpdatedEvent.builder()
                .id(userId)
                .status("ACTIVE")
                .build();
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.EXCHANGE_NAME,
                RabbitMQConfig.ROUTING_KEY_UPDATE,
                event
        );
        log.info("Published UserUnbannedEvent for userID: {}", userId);
    }
}
