package edu.iuh.fit.config;

import edu.iuh.fit.entity.UserProfile;
import edu.iuh.fit.repository.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserProfileRepository userProfileRepository;
    private static final String SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";

    @Override
    public void run(String... args) {
        if (!userProfileRepository.existsById(SYSTEM_USER_ID)) {
            log.info("Seeding System User identity...");
            UserProfile systemUser = UserProfile.builder()
                    .id(SYSTEM_USER_ID)
                    .email("system@alochat.me")
                    .firstName("Hệ thống")
                    .lastName("Alo Chat")
                    .status(UserProfile.UserStatus.ACTIVE)
                    .createdAt(LocalDateTime.now())
                    .lastActiveAt(LocalDateTime.now())
                    .warningCount(0)
                    .build();
            userProfileRepository.save(systemUser);
            log.info("System User seeded successfully.");
        }
    }
}
