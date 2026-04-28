package edu.iuh.fit.config;

import edu.iuh.fit.entity.UserProfile;
import edu.iuh.fit.repository.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class DataInitializer {

    private final UserProfileRepository userProfileRepository;
    private static final String SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";

    @Bean
    public CommandLineRunner initData() {
        return args -> {
            if (!userProfileRepository.existsById(SYSTEM_USER_ID)) {
                log.info("Initializing System User Profile...");
                UserProfile systemUser = UserProfile.builder()
                        .id(SYSTEM_USER_ID)
                        .email("system@alochat.io")
                        .firstName("Hệ thống")
                        .lastName("Alo Chat")
                        .phoneNumber("0000000000")
                        .status(UserProfile.UserStatus.ACTIVE)
                        .bio("Hệ thống thông báo tự động của Alo Chat")
                        .build();
                userProfileRepository.save(systemUser);
                log.info("System User Profile initialized successfully.");
            } else {
                log.info("System User Profile already exists.");
            }
        };
    }
}
