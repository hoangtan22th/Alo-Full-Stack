package edu.iuh.fit.service;

import edu.iuh.fit.config.RabbitMQConfig;
import edu.iuh.fit.dto.event.UserWarnedEvent;
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
        banUser(event.getTargetId());
    }

    @RabbitListener(bindings = @QueueBinding(
            value = @Queue(value = "user.warned.queue", durable = "true"),
            exchange = @Exchange(value = RabbitMQConfig.EXCHANGE_ADMIN, type = "topic"),
            key = RabbitMQConfig.ROUTING_KEY_USER_WARNED
    ))
    public void onUserWarned(UserWarnedEvent event) {
        log.info("Received USER_WARNED_EVENT for user: {}", event.getTargetId());
        try {
            Optional<UserProfile> userOpt = userRepository.findById(event.getTargetId());
            if (userOpt.isPresent()) {
                UserProfile user = userOpt.get();
                int currentCount = user.getWarningCount() != null ? user.getWarningCount() : 0;
                user.setWarningCount(currentCount + 1);
                userRepository.save(user);
                log.info("Incremented warningCount for user: {}. New count: {}", event.getTargetId(), user.getWarningCount());

                if (user.getWarningCount() >= 3) {
                    log.info("User {} reached 3 strikes. Triggering AUTO-BAN.", event.getTargetId());
                    banUser(event.getTargetId());
                    
                    // Publish ban event to trigger force logout via realtime-service
                    rabbitTemplate.convertAndSend(
                            RabbitMQConfig.EXCHANGE_ADMIN,
                            RabbitMQConfig.ROUTING_KEY_USER_BANNED,
                            UserBannedEvent.builder()
                                    .targetId(event.getTargetId())
                                    .adminNotes("Tài khoản bị khóa tự động do nhận đủ 3 cảnh cáo từ hệ thống.")
                                    .resolvedBy("00000000-0000-0000-0000-000000000000")
                                    .timestamp(java.time.LocalDateTime.now())
                                    .build()
                    );
                }
            }
        } catch (Exception e) {
            log.error("Error processing USER_WARNED_EVENT for target ID {}: {}", event.getTargetId(), e.getMessage());
        }
    }

    private void banUser(String userId) {
        try {
            Optional<UserProfile> userOpt = userRepository.findById(userId);
            if (userOpt.isPresent()) {
                UserProfile user = userOpt.get();
                user.setStatus(UserProfile.UserStatus.BANNED);
                userRepository.save(user);

                UserUpdatedEvent updateEvent = UserUpdatedEvent.builder()
                        .id(userId)
                        .status("BANNED")
                        .build();
                rabbitTemplate.convertAndSend(
                        RabbitMQConfig.EXCHANGE_NAME,
                        RabbitMQConfig.ROUTING_KEY_UPDATE,
                        updateEvent
                );

                log.info("Successfully banned user: {}", userId);
            } else {
                log.warn("Cannot ban user. User not found: {}", userId);
            }
        } catch (Exception e) {
            log.error("Failed to execute ban for user {}: {}", userId, e.getMessage());
        }
    }
}
