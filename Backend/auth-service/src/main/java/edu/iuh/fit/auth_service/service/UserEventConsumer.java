package edu.iuh.fit.auth_service.service;

import edu.iuh.fit.auth_service.config.RabbitMQConfig;
import edu.iuh.fit.auth_service.dto.UserUpdatedEvent;
import edu.iuh.fit.auth_service.entity.Account;
import edu.iuh.fit.auth_service.entity.AccountStatus;
import edu.iuh.fit.auth_service.repository.AccountRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserEventConsumer {

    private final AccountRepository accountRepository;

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
                    account.setStatus(AccountStatus.valueOf(event.getStatus()));
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
