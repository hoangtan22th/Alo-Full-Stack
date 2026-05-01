package edu.iuh.fit.service;

import edu.iuh.fit.config.RabbitMQConfig;
import edu.iuh.fit.entity.UserProfile;
import edu.iuh.fit.repository.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class PresenceEventListener {

    private final UserProfileRepository userProfileRepository;

    @RabbitListener(queues = RabbitMQConfig.QUEUE_PRESENCE)
    @Transactional
    public void handlePresenceEvent(Map<String, Object> payload, Message message) {
        String routingKey = message.getMessageProperties().getReceivedRoutingKey();
        String userId = (String) payload.get("userId");
        
        log.info("Received presence event: {} for user: {}", routingKey, userId);

        userProfileRepository.findById(userId).ifPresentOrElse(profile -> {
            if ("user.online".equals(routingKey)) {
                profile.setIsOnline(true);
                profile.setLastActiveAt(LocalDateTime.now());
                log.info("User [{}] is now ONLINE", userId);
            } else if ("user.offline".equals(routingKey)) {
                profile.setIsOnline(false);
                profile.setLastActiveAt(LocalDateTime.now());
                log.info("User [{}] is now OFFLINE", userId);
            }
            userProfileRepository.save(profile);
        }, () -> log.warn("User profile not found for ID: {}", userId));
    }
}
