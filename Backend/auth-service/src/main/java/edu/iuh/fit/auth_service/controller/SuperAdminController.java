package edu.iuh.fit.auth_service.controller;

import edu.iuh.fit.auth_service.dto.request.CreateAdminRequest;
import edu.iuh.fit.auth_service.dto.response.AdminResponse;
import edu.iuh.fit.auth_service.service.SuperAdminService;
import edu.iuh.fit.common_service.dto.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/management/admins")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN')")
public class SuperAdminController {

    private final SuperAdminService superAdminService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<AdminResponse>>> getAdmins() {
        return ResponseEntity.ok(ApiResponse.success(superAdminService.getAdmins()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<String>> createAdmin(@Valid @RequestBody CreateAdminRequest request) {
        superAdminService.createAdmin(request);
        return ResponseEntity.ok(ApiResponse.success("Tạo Admin thành công"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<String>> deleteAdmin(@PathVariable String id) {
        superAdminService.deleteAdmin(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa Admin thành công"));
    }
}