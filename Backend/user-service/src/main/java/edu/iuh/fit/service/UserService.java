package edu.iuh.fit.service;

import edu.iuh.fit.dto.request.UserUpdateRequest;
import edu.iuh.fit.dto.response.UserDto;
import edu.iuh.fit.dto.response.UserQuickStatsResponse;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;

import java.util.List;

public interface UserService {

    UserDto getUserById(String id);

    List<UserDto> getUsersByIds(List<String> ids);

    UserDto updateUser(String id, UserUpdateRequest request);

    void deleteUser(String id); // Hard delete or ban user

    void unbanUser(String id); // Unban user

    // Tìm kiếm kết hợp (Tên + Email + SDT) bằng Pagination
    Page<UserDto> searchUsersDynamic(String fullName, String email, String phoneNumber, Pageable pageable);

    // Tìm kiếm cho Admin (có thể tìm theo tên, email, SDT) với Pagination
    Page<UserDto> searchAdminUsers(String keyword, String statusStr, Pageable pageable);

    UserDto updateAvatarOrCover(String id, org.springframework.web.multipart.MultipartFile file, boolean isAvatar)
            throws java.io.IOException;

    UserQuickStatsResponse getQuickStats();

    List<String> getAllUserIds();
}
