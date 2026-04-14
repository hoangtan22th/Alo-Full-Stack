package edu.iuh.fit.service;

import edu.iuh.fit.config.RabbitMQConfig;
import edu.iuh.fit.dto.UserRegisteredEvent;
import edu.iuh.fit.entity.UserProfile;
import edu.iuh.fit.repository.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserEventConsumer {

    private final UserProfileRepository userProfileRepository;

    @RabbitListener(queues = RabbitMQConfig.QUEUE_REGISTRATION)
    @Transactional
    public void consumeUserRegistration(UserRegisteredEvent event) {
        log.info("Received UserRegisteredEvent from Auth Service for ID: {}", event.getId());
        
        // Kiểm tra xem đã tồn tại chưa (indempotent design)
        if (userProfileRepository.existsById(event.getId())) {
             log.warn("UserProfile with ID {} already exists. Skipping...", event.getId());
             return;
        }

        UserProfile userProfile = UserProfile.builder()
                .id(event.getId())
                .email(event.getEmail())
                // Lưu từ form ban đầu gửi
                .firstName(event.getFullName() != null ? event.getFullName().split(" ", 2)[0] : null)
                .lastName(event.getFullName() != null && event.getFullName().split(" ", 2).length > 1 ? event.getFullName().split(" ", 2)[1] : "")
                .phoneNumber(event.getPhoneNumber())
                .avatarUrl(event.getAvatarUrl())
                .coverUrl(event.getCoverUrl())
                .gender(event.getGender() != null ? UserProfile.Gender.values()[Math.min(event.getGender(), UserProfile.Gender.values().length - 1)] : null)
                .build();
                
        userProfileRepository.save(userProfile);
        log.info("Successfully created empty UserProfile for ID: {}", event.getId());
    }
}
