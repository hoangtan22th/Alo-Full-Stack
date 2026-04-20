package edu.iuh.fit.auth_service.repository;

import edu.iuh.fit.auth_service.entity.Account;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AccountRepository extends JpaRepository<Account, String> {

    @Query("SELECT DISTINCT a FROM Account a JOIN a.roles r WHERE r.name IN :roleNames")
    List<Account> findByRolesNameIn(@Param("roleNames") List<String> roleNames);

    Optional<Account> findByEmail(String email);

    Optional<Account> findByPhoneNumber(String phoneNumber);

    Optional<Account> findByEmailOrPhoneNumber(String email, String phoneNumber);

    boolean existsByEmail(String email);

    boolean existsByPhoneNumber(String phoneNumber);
}
