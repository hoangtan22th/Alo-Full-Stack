package edu.iuh.fit.repository;

import edu.iuh.fit.entity.UserProfile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface UserProfileRepository extends JpaRepository<UserProfile, String> {

    @Query("SELECT u FROM UserProfile u WHERE "
            + "(:fullName IS NULL OR LOWER(CONCAT(u.firstName, ' ', u.lastName)) LIKE LOWER(CONCAT('%', :fullName, '%'))) AND "
            + "(:email IS NULL OR LOWER(u.email) LIKE LOWER(CONCAT('%', :email, '%'))) AND "
            + "(:phoneNumber IS NULL OR u.phoneNumber LIKE CONCAT('%', :phoneNumber, '%'))")
    Page<UserProfile> searchUsersDynamic(@Param("fullName") String fullName,
            @Param("email") String email,
            @Param("phoneNumber") String phoneNumber,
            Pageable pageable);

    @Query("SELECT u FROM UserProfile u WHERE "
            + "(:keyword IS NULL OR "
            + "LOWER(CONCAT(u.firstName, ' ', u.lastName)) LIKE LOWER(CONCAT('%', :keyword, '%')) OR "
            + "LOWER(u.email) LIKE LOWER(CONCAT('%', :keyword, '%')) OR "
            + "u.phoneNumber LIKE CONCAT('%', :keyword, '%')) AND "
            + "(:status IS NULL OR u.status = :status)")
    Page<UserProfile> searchAdminUsers(@Param("keyword") String keyword, @Param("status") UserProfile.UserStatus status, Pageable pageable);

    boolean existsByPhoneNumber(String phoneNumber);

    boolean existsByPhoneNumberAndIdNot(String phoneNumber, String id);

    long countByCreatedAtAfter(java.time.LocalDateTime dateTime);

    long countByStatus(UserProfile.UserStatus status);
}
