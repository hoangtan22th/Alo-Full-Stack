package edu.iuh.fit.auth_service.messaging;

import edu.iuh.fit.auth_service.config.RabbitMQConfig;
import edu.iuh.fit.auth_service.dto.event.UserBannedEvent;
import edu.iuh.fit.auth_service.dto.event.UserUnbannedEvent;
import edu.iuh.fit.auth_service.entity.Account;
import edu.iuh.fit.auth_service.entity.AccountStatus;
import edu.iuh.fit.auth_service.repository.AccountRepository;
import edu.iuh.fit.auth_service.repository.UserSessionRepository;
import edu.iuh.fit.auth_service.service.RabbitMQPublisher;
import edu.iuh.fit.auth_service.entity.UserSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Component
@Slf4j
@RequiredArgsConstructor
public class AccountAdminEventListener {

    private final AccountRepository accountRepository;
    private final UserSessionRepository userSessionRepository;
    private final RabbitMQPublisher rabbitMQPublisher;

    @RabbitListener(queues = RabbitMQConfig.QUEUE_AUTH_USER_BANNED)
    @Transactional
    public void handleUserBannedEvent(UserBannedEvent event) {
        log.info("Received USER_BANNED_EVENT from admin.exchange for account ID: {}", event.getTargetId());

        accountRepository.findById(event.getTargetId()).ifPresentOrElse(account -> {
            account.setStatus(AccountStatus.BANNED);
            accountRepository.save(account);
            log.info("Successfully updated account {} status to BANNED. Admin Notes: {}", account.getId(), event.getAdminNotes());

            // Force Logout all sessions of BANNED user
            List<UserSession> activeSessions = userSessionRepository.findByAccountId(event.getTargetId());
            if (!activeSessions.isEmpty()) {
                List<String> killedSessionIds = activeSessions.stream()
                        .map(UserSession::getId)
                        .collect(Collectors.toList());

                userSessionRepository.deleteAllByAccountId(event.getTargetId());
                rabbitMQPublisher.publishForceLogoutEvent(event.getTargetId(), killedSessionIds, "Tài khoản của bạn đã bị khóa bởi Quản trị viên");
                log.info("Force logged out {} sessions for BANNED account ID: {}", killedSessionIds.size(), event.getTargetId());
            }
        }, () -> {
            log.warn("Account with ID {} not found while attempting to ban.", event.getTargetId());
        });
    }
    
    @RabbitListener(queues = RabbitMQConfig.QUEUE_AUTH_USER_UNBANNED)
    @Transactional
    public void handleUserUnbannedEvent(UserUnbannedEvent event) {
        log.info("Received USER_UNBANNED_EVENT from admin.exchange for account ID: {}", event.getTargetId());

        accountRepository.findById(event.getTargetId()).ifPresentOrElse(account -> {
            account.setStatus(AccountStatus.ACTIVE);
            accountRepository.save(account);
            log.info("Successfully updated account {} status to ACTIVE. Admin Notes: {}", account.getId(), event.getAdminNotes());
        }, () -> {
            log.warn("Account with ID {} not found while attempting to unban.", event.getTargetId());
        });
    }
}
