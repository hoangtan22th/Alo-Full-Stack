package edu.iuh.fit.auth_service.repository;

import edu.iuh.fit.auth_service.entity.QrSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface QrSessionRepository extends JpaRepository<QrSession, String> {
    Optional<QrSession> findByQrToken(String qrToken);
}
