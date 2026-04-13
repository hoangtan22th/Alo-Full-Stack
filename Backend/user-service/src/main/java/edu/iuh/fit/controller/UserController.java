package edu.iuh.fit.controller;

import edu.iuh.fit.dto.request.UserUpdateRequest;
import edu.iuh.fit.dto.response.UserDto;
import edu.iuh.fit.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    // Lấy thông tin user theo ID
    @GetMapping("/{id}")
    public ResponseEntity<UserDto> getUserById(@PathVariable String id) {
        return ResponseEntity.ok(userService.getUserById(id));
    }

    // Lấy thông tin nhiều user qua IDs (Batch) để giảm tải
    @PostMapping("/batch")
    public ResponseEntity<List<UserDto>> getUsersByIds(@RequestBody List<String> ids) {
        return ResponseEntity.ok(userService.getUsersByIds(ids));
    }

    // Cập nhật thông tin user
    @PutMapping("/{id}")
    public ResponseEntity<UserDto> updateUser(@PathVariable String id, @RequestBody UserUpdateRequest request) {
        return ResponseEntity.ok(userService.updateUser(id, request));
    }

    // Xóa/Ban user
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable String id) {
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }

    // Tìm kiếm users (có phân trang) và trả về tất cả
    @GetMapping({"", "/search"})
    public ResponseEntity<Page<UserDto>> searchUsers(
            @RequestParam(required = false) String fullName,
            @RequestParam(required = false) String email,
            @RequestParam(required = false) String phoneNumber,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
            
        Pageable pageable = PageRequest.of(page, size);

        // Truyền thẳng 3 tham số vào lớp service thay vì chia if-else
        // Nếu cái nào không truyền, Spring sẽ gán là "null", và cái @Query SQL của chúng ta sẽ thông minh bỏ qua lỗi đó
        return ResponseEntity.ok(userService.searchUsersDynamic(fullName, email, phoneNumber, pageable));
    }
}
