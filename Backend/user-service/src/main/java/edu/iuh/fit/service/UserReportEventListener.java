package edu.iuh.fit.service;

import edu.iuh.fit.config.RabbitMQConfig;
import edu.iuh.fit.dto.event.UserBannedEvent;
import edu.iuh.fit.dto.UserUpdatedEvent;
import edu.iuh.fit.entity.UserProfile;
import edu.iuh.fit.repository.UserProfileRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.Exchange;
import org.springframework.amqp.rabbit.annotation.Queue;
import org.springframework.amqp.rabbit.annotation.QueueBinding;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Service;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserReportEventListener {

    private final UserProfileRepository userRepository;
    private final RabbitTemplate rabbitTemplate;

    @RabbitListener(bindings = @QueueBinding(
            value = @Queue(value = "user.banned.queue", durable = "true"),
            exchange = @Exchange(value = RabbitMQConfig.EXCHANGE_ADMIN, type = "topic"),
            key = RabbitMQConfig.ROUTING_KEY_USER_BANNED
    ))
    public void onUserBanned(UserBannedEvent event) {
        log.info("Received USER_BANNED_EVENT for user: {}", event.getTargetId());
        try {
            Optional<UserProfile> userOpt = userRepository.findById(event.getTargetId());
            if (userOpt.isPresent()) {
                UserProfile user = userOpt.get();
                user.setStatus(UserProfile.UserStatus.BANNED);
                userRepository.save(user);
                
                // Cập nhật giao diện / caches cho các service khác giống như lúc Banning từ User Management
                UserUpdatedEvent updateEvent = UserUpdatedEvent.builder()
                        .id(event.getTargetId())
                        .status("BANNED")
                        .build();
                rabbitTemplate.convertAndSend(
                        RabbitMQConfig.EXCHANGE_NAME,
                        RabbitMQConfig.ROUTING_KEY_UPDATE,
                        updateEvent
                );
                
                log.info("Successfully updated status to BANNED and published update for user: {}", event.getTargetId());
            } else {
                log.warn("Cannot ban user. User not found in DB with ID: {}", event.getTargetId());
            }
        } catch (Exception e) {
            log.error("Error processing USER_BANNED_EVENT for target ID {}: {}", event.getTargetId(), e.getMessage());
        }
    }
}
