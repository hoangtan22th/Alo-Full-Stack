package edu.iuh.fit.auth_service.service;

import edu.iuh.fit.auth_service.config.RabbitMQConfig;
import edu.iuh.fit.auth_service.dto.UserUpdatedEvent;
import edu.iuh.fit.auth_service.entity.Account;
import edu.iuh.fit.auth_service.entity.AccountStatus;
import edu.iuh.fit.auth_service.entity.UserSession;
import edu.iuh.fit.auth_service.repository.AccountRepository;
import edu.iuh.fit.auth_service.repository.UserSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserEventConsumer {

    private final AccountRepository accountRepository;
    private final UserSessionRepository userSessionRepository;
    private final RabbitMQPublisher rabbitMQPublisher;

    @RabbitListener(queues = RabbitMQConfig.QUEUE_AUTH_UPDATE)
    @Transactional
    public void consumeUserUpdate(UserUpdatedEvent event) {
        log.info("Received UserUpdatedEvent from User Service for ID: {}", event.getId());

        accountRepository.findById(event.getId()).ifPresentOrElse(account -> {
            if (event.getPhoneNumber() != null) {
                account.setPhoneNumber(event.getPhoneNumber());
            }
            if (event.getStatus() != null) {
                try {
                    AccountStatus newStatus = AccountStatus.valueOf(event.getStatus());
                    account.setStatus(newStatus);

                    // Nếu tài khoản bị BAN, hãy đăng xuất ngay lập tức tất cả các thiết bị.
                    if (newStatus == AccountStatus.BANNED) {
                        List<UserSession> activeSessions = userSessionRepository.findByAccountId(event.getId());
                        if (!activeSessions.isEmpty()) {
                            List<String> killedSessionIds = activeSessions.stream()
                                    .map(UserSession::getId)
                                    .collect(Collectors.toList());

                            userSessionRepository.deleteAllByAccountId(event.getId());
                            rabbitMQPublisher.publishForceLogoutEvent(event.getId(), killedSessionIds, "Tài khoản của bạn đã bị khóa bởi Quản trị viên");
                            log.info("Force logged out {} sessions for BANNED account ID: {}", killedSessionIds.size(), event.getId());
                        }
                    }
                } catch (IllegalArgumentException e) {
                    log.warn("Invalid AccountStatus: {}", event.getStatus());
                }
            }
            accountRepository.save(account);
            log.info("Successfully updated Account ID: {}", event.getId());
        }, () -> {
            log.warn("Account with ID {} not found. Could not update.", event.getId());
        });
    }
}
