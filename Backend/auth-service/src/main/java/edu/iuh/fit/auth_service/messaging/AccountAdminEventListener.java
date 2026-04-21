package edu.iuh.fit.auth_service.messaging;

import edu.iuh.fit.auth_service.config.RabbitMQConfig;
import edu.iuh.fit.auth_service.dto.event.UserBannedEvent;
import edu.iuh.fit.auth_service.entity.Account;
import edu.iuh.fit.auth_service.entity.AccountStatus;
import edu.iuh.fit.auth_service.repository.AccountRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Slf4j
@RequiredArgsConstructor
public class AccountAdminEventListener {

    private final AccountRepository accountRepository;

    @RabbitListener(queues = RabbitMQConfig.QUEUE_AUTH_USER_BANNED)
    @Transactional
    public void handleUserBannedEvent(UserBannedEvent event) {
        log.info("Received USER_BANNED_EVENT from report-service for account ID: {}", event.getTargetId());

        accountRepository.findById(event.getTargetId()).ifPresentOrElse(account -> {
            account.setStatus(AccountStatus.BANNED);
            accountRepository.save(account);
            log.info("Successfully updated account {} status to BANNED. Admin Notes: {}", account.getId(), event.getAdminNotes());
        }, () -> {
            log.warn("Account with ID {} not found while attempting to ban.", event.getTargetId());
        });
    }
}
