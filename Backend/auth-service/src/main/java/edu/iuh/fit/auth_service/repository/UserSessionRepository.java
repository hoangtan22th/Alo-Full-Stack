package edu.iuh.fit.auth_service.repository;

import edu.iuh.fit.auth_service.entity.UserSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserSessionRepository extends JpaRepository<UserSession, String> {

    // Tìm tất cả các phiên đăng nhập của 1 User để hiển thị danh sách thiết bị
    List<UserSession> findByAccountId(String accountId);

    // Tìm phiên cụ thể theo Token ID để thu hồi (Logout)
    Optional<UserSession> findByRefreshTokenId(String refreshTokenId);

    // Xóa một phiên cụ thể của User trên một thiết bị nhất định
    void deleteByAccountIdAndDeviceId(String accountId, String deviceId);

    // Xóa tất cả các phiên của User
    void deleteAllByAccountId(String accountId);

    @Modifying
    void deleteByRefreshTokenId(String refreshTokenId);
}