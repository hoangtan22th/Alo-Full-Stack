package edu.iuh.fit.auth_service.repository;

import edu.iuh.fit.auth_service.entity.Account;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

@Repository
public interface AccountRepository extends JpaRepository<Account, String> {

    @Query("SELECT DISTINCT a FROM Account a "
            + "WHERE a.id IN (SELECT a1.id FROM Account a1 JOIN a1.roles r1 WHERE r1.name IN ('ROLE_ADMIN', 'ROLE_SUPER_ADMIN')) "
            + "AND (:roleFilter IS NULL OR :roleFilter = 'ALL' "
            + "  OR (:roleFilter = 'SUPER_ADMIN' AND a.id IN (SELECT a2.id FROM Account a2 JOIN a2.roles r2 WHERE r2.name = 'ROLE_SUPER_ADMIN')) "
            + "  OR (:roleFilter = 'ADMIN' AND a.id NOT IN (SELECT a3.id FROM Account a3 JOIN a3.roles r3 WHERE r3.name = 'ROLE_SUPER_ADMIN')) "
            + ") "
            + "AND (:search IS NULL OR :search = '' OR LOWER(a.fullName) LIKE LOWER(CONCAT('%', :search, '%')) "
            + "OR LOWER(a.email) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Account> findAdminsFilteredAndPaginated(@Param("search") String search, @Param("roleFilter") String roleFilter, Pageable pageable);

    @Query("SELECT DISTINCT a FROM Account a JOIN a.roles r WHERE r.name IN :roleNames "
            + "AND (:search IS NULL OR LOWER(a.fullName) LIKE LOWER(CONCAT('%', :search, '%')) "
            + "OR LOWER(a.email) LIKE LOWER(CONCAT('%', :search, '%')))")
    List<Account> findByRolesNameInAndSearch(@Param("roleNames") List<String> roleNames, @Param("search") String search);

    @Query("SELECT DISTINCT a FROM Account a JOIN a.roles r WHERE r.name IN :roleNames")
    List<Account> findByRolesNameIn(@Param("roleNames") List<String> roleNames);

    Optional<Account> findByEmail(String email);

    Optional<Account> findByPhoneNumber(String phoneNumber);

    Optional<Account> findByEmailOrPhoneNumber(String email, String phoneNumber);

    boolean existsByEmail(String email);

    boolean existsByPhoneNumber(String phoneNumber);
}
