package edu.iuh.fit.auth_service.repository;

import edu.iuh.fit.auth_service.entity.Account;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AccountRepository extends JpaRepository<Account, String> {
    Optional<Account> findByEmail(String email);
    Optional<Account> findByPhoneNumber(String phoneNumber);
    Optional<Account> findByEmailOrPhoneNumber(String email, String phoneNumber);
    boolean existsByEmail(String email);
}
