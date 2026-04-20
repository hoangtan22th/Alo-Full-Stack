package edu.iuh.fit.auth_service.service;

import edu.iuh.fit.auth_service.dto.request.CreateAdminRequest;
import edu.iuh.fit.auth_service.dto.response.AdminResponse;
import edu.iuh.fit.auth_service.entity.Account;
import edu.iuh.fit.auth_service.entity.AccountStatus;
import edu.iuh.fit.auth_service.entity.Role;
import edu.iuh.fit.auth_service.repository.AccountRepository;
import edu.iuh.fit.auth_service.repository.RoleRepository;
import edu.iuh.fit.common_service.exception.AppException;
import edu.iuh.fit.common_service.exception.DuplicateResourceException;
import edu.iuh.fit.common_service.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SuperAdminService {

    private final AccountRepository accountRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final RabbitMQPublisher rabbitMQPublisher;

    public List<AdminResponse> getAdmins() {
        return accountRepository.findByRolesNameIn(List.of("ROLE_ADMIN", "ROLE_SUPER_ADMIN")).stream()
                .map(acc -> {
                    boolean isSuperAdmin = acc.getRoles().stream()
                            .anyMatch(r -> r.getName().equals("ROLE_SUPER_ADMIN"));
                    String role = isSuperAdmin ? "ROLE_SUPER_ADMIN" : "ROLE_ADMIN";
                    return new AdminResponse(
                            acc.getId(),
                            acc.getEmail(),
                            acc.getEmail().split("@")[0], // Fallback name
                            role,
                            acc.getCreatedAt()
                    );
                })
                .collect(Collectors.toList());
    }

    @Transactional
    public void createAdmin(CreateAdminRequest request) {
        if (accountRepository.findByEmail(request.email()).isPresent()) {
            throw new DuplicateResourceException("Email đã tồn tại");
        }

        String roleName = request.role() != null && request.role().equals("ROLE_SUPER_ADMIN") ? "ROLE_SUPER_ADMIN" : "ROLE_ADMIN";
        Role adminRole = roleRepository.findByName(roleName)
                .orElseThrow(() -> new ResourceNotFoundException("Role không tồn tại"));

        Set<Role> roles = new HashSet<>();
        roles.add(adminRole);

        Account admin = Account.builder()
                .id(UUID.randomUUID().toString())
                .email(request.email())
                .password(passwordEncoder.encode(request.password()))
                .authProvider(Account.AuthProvider.LOCAL)
                .status(AccountStatus.ACTIVE)
                .roles(roles)
                .build();

        admin = accountRepository.save(admin);
    }

    @Transactional
    public void deleteAdmin(String id) {
        Account admin = accountRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tài khoản không tồn tại"));

        boolean isSuperAdmin = admin.getRoles().stream()
                .anyMatch(r -> r.getName().equals("ROLE_SUPER_ADMIN"));

        if (isSuperAdmin) {
            throw new AppException(403, "Không thể xóa tài khoản SUPER_ADMIN");
        }

        admin.setEmail(admin.getEmail() + "_deleted_" + System.currentTimeMillis());
        accountRepository.saveAndFlush(admin);
        accountRepository.delete(admin);
    }
}
