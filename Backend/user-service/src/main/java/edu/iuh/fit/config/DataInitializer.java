package edu.iuh.fit.config;

import edu.iuh.fit.entity.UserProfile;
import edu.iuh.fit.repository.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Arrays;
import java.util.List;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class DataInitializer {

    private final UserProfileRepository userProfileRepository;

    // Bot IDs
    private static final String SYSTEM_BOT_ID = "00000000-0000-0000-0000-000000000000";
    private static final String SECURITY_BOT_ID = "11111111-1111-1111-1111-111111111111";
    private static final String EVENT_BOT_ID = "22222222-2222-2222-2222-222222222222";

    @Bean
    public CommandLineRunner initData() {
        return args -> {
            List<UserProfile> bots = Arrays.asList(
                    UserProfile.builder()
                            .id(SYSTEM_BOT_ID)
                            .email("system@system.alochat.io")
                            .firstName("Alo Chat")
                            .lastName("System")
                            .phoneNumber("0000000000")
                            .status(UserProfile.UserStatus.ACTIVE)
                            .bio("Hệ thống thông báo tự động của Alo Chat")
                            .build(),
                    UserProfile.builder()
                            .id(SECURITY_BOT_ID)
                            .email("security@system.alochat.io")
                            .firstName("Alo Chat")
                            .lastName("Security")
                            .phoneNumber("1111111111")
                            .status(UserProfile.UserStatus.ACTIVE)
                            .bio("Trung tâm bảo mật và cảnh báo của Alo Chat")
                            .build(),
                    UserProfile.builder()
                            .id(EVENT_BOT_ID)
                            .email("event@system.alochat.io")
                            .firstName("Alo Chat")
                            .lastName("Sự Kiện")
                            .phoneNumber("2222222222")
                            .status(UserProfile.UserStatus.ACTIVE)
                            .bio("Kênh thông báo sự kiện và tin nhắn hệ thống")
                            .build()
            );

            for (UserProfile bot : bots) {
                if (!userProfileRepository.existsById(bot.getId())) {
                    log.info("Initializing System Bot: {}...", bot.getFirstName() + " " + bot.getLastName());
                    userProfileRepository.save(bot);
                    log.info("Initialized System Bot: {}", bot.getFirstName() + " " + bot.getLastName());
                } else {
                    log.debug("System Bot: {} already exists.", bot.getFirstName() + " " + bot.getLastName());
                }
            }
        };
    }
}
