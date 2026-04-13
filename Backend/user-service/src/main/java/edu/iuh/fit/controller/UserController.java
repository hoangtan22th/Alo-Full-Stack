package edu.iuh.fit.controller;

import edu.iuh.fit.common_service.dto.response.ApiResponse;
import edu.iuh.fit.common_service.dto.response.PageResponse;
import edu.iuh.fit.dto.request.UserUpdateRequest;
import edu.iuh.fit.dto.response.UserDto;
import edu.iuh.fit.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    // Lấy thông tin user theo ID (Admin hoặc Service khác gọi)
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<UserDto>> getUserById(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(userService.getUserById(id)));
    }

    // Lấy thông tin cá nhân của người dùng đang đăng nhập
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserDto>> getMyProfile(@RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(ApiResponse.success(userService.getUserById(userId)));
    }

    // Cập nhật thông tin cá nhân hiện tại
    @PutMapping("/me")
    public ResponseEntity<ApiResponse<UserDto>> updateMyProfile(@RequestHeader("X-User-Id") String userId, @RequestBody UserUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(userService.updateUser(userId, request)));
    }

    // Cập nhật Avatar
    @PostMapping(value = "/me/avatar", consumes = "multipart/form-data")
    public ResponseEntity<ApiResponse<UserDto>> updateMyAvatar(
            @RequestHeader("X-User-Id") String userId,
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file) throws java.io.IOException {
        return ResponseEntity.ok(ApiResponse.success(userService.updateAvatarOrCover(userId, file, true)));
    }

    // Cập nhật Cover
    @PostMapping(value = "/me/cover", consumes = "multipart/form-data")
    public ResponseEntity<ApiResponse<UserDto>> updateMyCover(
            @RequestHeader("X-User-Id") String userId,
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file) throws java.io.IOException {
        return ResponseEntity.ok(ApiResponse.success(userService.updateAvatarOrCover(userId, file, false)));
    }

    // Cập nhật thông tin user (Admin)
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<UserDto>> updateUser(@PathVariable String id, @RequestBody UserUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(userService.updateUser(id, request)));
    }

    // Xóa/Ban user
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteUser(@PathVariable String id) {
        userService.deleteUser(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    // Tìm kiếm users (có phân trang) và trả về tất cả
    @GetMapping({"", "/search"})
    public ResponseEntity<ApiResponse<PageResponse<UserDto>>> searchUsers(
            @RequestParam(required = false) String fullName,
            @RequestParam(required = false) String email,
            @RequestParam(required = false) String phoneNumber,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
            
        Pageable pageable = PageRequest.of(page, size);
        Page<UserDto> users = userService.searchUsersDynamic(fullName, email, phoneNumber, pageable);
        
        PageResponse<UserDto> pageResponse = PageResponse.<UserDto>builder()
            .content(users.getContent())
            .page(users.getNumber())
            .size(users.getSize())
            .totalElements(users.getTotalElements())
            .totalPages(users.getTotalPages())
            .last(users.isLast())
            .build();
            
        return ResponseEntity.ok(ApiResponse.success(pageResponse));
    }

    // API: Lấy list User theo danh sách ID
    @PostMapping("/by-ids")
    public ResponseEntity<ApiResponse<java.util.List<UserDto>>> getUsersByIds(@RequestBody java.util.List<String> ids) {
        return ResponseEntity.ok(ApiResponse.success(userService.getUsersByIds(ids)));
    }
}
