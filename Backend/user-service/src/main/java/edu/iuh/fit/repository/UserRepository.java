package edu.iuh.fit.repository;

import edu.iuh.fit.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, String> {
    Optional<User> findByEmail(String email);
    Optional<User> findByPhoneNumber(String phoneNumber);
    
    // Tìm kiếm đa điều kiện (Dynamic Search), nếu tham số nào bị truyền rỗng thì sẽ tự động bỏ qua cột đó
    @Query("SELECT u FROM User u WHERE " +
           "(:fullName IS NULL OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :fullName, '%'))) AND " +
           "(:email IS NULL OR LOWER(u.email) LIKE LOWER(CONCAT('%', :email, '%'))) AND " +
           "(:phoneNumber IS NULL OR u.phoneNumber LIKE CONCAT('%', :phoneNumber, '%'))")
    Page<User> searchUsersDynamic(@Param("fullName") String fullName, 
                                  @Param("email") String email, 
                                  @Param("phoneNumber") String phoneNumber, 
                                  Pageable pageable);
}
