package edu.iuh.fit.auth_service.config;

import edu.iuh.fit.auth_service.entity.Account;
import edu.iuh.fit.auth_service.entity.AccountStatus;
import edu.iuh.fit.auth_service.entity.Role;
import edu.iuh.fit.auth_service.repository.AccountRepository;
import edu.iuh.fit.auth_service.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Configuration
@RequiredArgsConstructor
public class DatabaseSeeder {

    private final AccountRepository accountRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Bean
    public CommandLineRunner initSuperAdmin() {
        return args -> {
            // First, ensure roles exist
            Role superAdminRole = roleRepository.findByName("ROLE_SUPER_ADMIN").orElseGet(() -> {
                Role role = new Role();
                role.setName("ROLE_SUPER_ADMIN");
                return roleRepository.save(role);
            });

            Role adminRole = roleRepository.findByName("ROLE_ADMIN").orElseGet(() -> {
                Role role = new Role();
                role.setName("ROLE_ADMIN");
                return roleRepository.save(role);
            });

            Role userRole = roleRepository.findByName("ROLE_USER").orElseGet(() -> {
                Role role = new Role();
                role.setName("ROLE_USER");
                return roleRepository.save(role);
            });

            // Second, check and create super admin
            String superAdminEmail = "superadmin@alo.com";
            if (accountRepository.findByEmail(superAdminEmail).isEmpty()) {
                Set<Role> roles = new HashSet<>();
                roles.add(superAdminRole);
                roles.add(adminRole);

                Account superAdmin = Account.builder()
                        .id(UUID.randomUUID().toString())
                        .email(superAdminEmail)
                        .password(passwordEncoder.encode("SuperAdmin@123"))
                        .authProvider(Account.AuthProvider.LOCAL)
                        .status(AccountStatus.ACTIVE)
                        .roles(roles)
                        .build();

                accountRepository.save(superAdmin);
                System.out.println("✅ DEFAULT SUPER_ADMIN ACCOUNT CREATED ✅");
                System.out.println("Email: " + superAdminEmail);
                System.out.println("Password: SuperAdmin@123");
                System.out.println("========================================");
            }
        };
    }
}
