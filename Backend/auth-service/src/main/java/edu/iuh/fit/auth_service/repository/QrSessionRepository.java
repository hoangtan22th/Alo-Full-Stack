package edu.iuh.fit.auth_service.repository;

import edu.iuh.fit.auth_service.entity.QrSession;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface QrSessionRepository extends CrudRepository<QrSession, String> {
    Optional<QrSession> findByQrToken(String qrToken);
}
