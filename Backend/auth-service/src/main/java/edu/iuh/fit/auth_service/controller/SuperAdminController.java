package edu.iuh.fit.auth_service.controller;

import edu.iuh.fit.auth_service.dto.request.CreateAdminRequest;
import edu.iuh.fit.auth_service.dto.request.UpdateAdminRequest;
import edu.iuh.fit.auth_service.dto.response.AdminResponse;
import edu.iuh.fit.auth_service.service.SuperAdminService;
import edu.iuh.fit.common_service.dto.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/management/admins")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ROLE_SUPER_ADMIN')")
public class SuperAdminController {

    private final SuperAdminService superAdminService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<AdminResponse>>> getAdmins(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String roleFilter,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(ApiResponse.success(superAdminService.getAdmins(search, roleFilter, pageable)));
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

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<String>> updateAdmin(@PathVariable String id, @Valid @RequestBody UpdateAdminRequest request) {
        superAdminService.updateAdmin(id, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật Admin thành công"));
    }
}
