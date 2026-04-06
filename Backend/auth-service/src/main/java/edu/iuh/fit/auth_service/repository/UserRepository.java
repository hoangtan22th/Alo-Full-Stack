package edu.iuh.fit.auth_service.repository;

import edu.iuh.fit.auth_service.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, String> {

    // Tìm kiếm người dùng bằng email (dùng cho Login và check trùng khi Register)
    Optional<User> findByEmail(String email);

    // Kiểm tra xem email đã tồn tại hay chưa
    boolean existsByEmail(String email);
}