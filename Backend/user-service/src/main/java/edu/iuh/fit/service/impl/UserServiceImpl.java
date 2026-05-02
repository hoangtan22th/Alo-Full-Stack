package edu.iuh.fit.service.impl;

import edu.iuh.fit.common_service.exception.AppException;
import edu.iuh.fit.common_service.exception.DuplicateResourceException;
import edu.iuh.fit.dto.request.UserUpdateRequest;
import edu.iuh.fit.dto.response.UserDto;
import edu.iuh.fit.dto.response.UserQuickStatsResponse;
import edu.iuh.fit.entity.UserProfile;
import edu.iuh.fit.repository.UserProfileRepository;
import edu.iuh.fit.service.RabbitMQPublisher;
import edu.iuh.fit.service.S3Service;
import edu.iuh.fit.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private static final String DEFAULT_AVATAR_URL = "https://btl-alo-chat.s3.ap-southeast-1.amazonaws.com/alo_user_images/user_avt.png";
    private static final String DEFAULT_COVER_URL = "https://btl-alo-chat.s3.ap-southeast-1.amazonaws.com/alo_cover_images/default-cover-img.jpg";

    private final UserProfileRepository userProfileRepository;
    private final S3Service s3Service;
    private final RabbitMQPublisher rabbitMQPublisher;

    @Override
    public UserDto getUserById(String id) {
        UserProfile user = userProfileRepository.findById(id)
                .orElseThrow(() -> new edu.iuh.fit.common_service.exception.AppException(
                        404, "Không tìm thấy người dùng với ID: " + id));
        return UserDto.fromEntity(user);
    }

    @Override
    public UserDto updateUser(String id, UserUpdateRequest request) {
        UserProfile user = userProfileRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("UserProfile not found with id: " + id));

        // Phân tách fullName gửi lên thay firstName/lastName nếu cần,
        // Nhưng ở đây nên bổ sung request phù hợp. Vì DTO cũ dùng FullName,
        // Ta tạm đặt tất cả vào firstName, hoặc split bằng khoảng trắng.
        if (request.getFullName() != null) {
            String[] parts = request.getFullName().split(" ", 2);
            if (parts.length > 1) {
                user.setFirstName(parts[0]);
                user.setLastName(parts[1]);
            } else {
                user.setFirstName(parts[0]);
                user.setLastName("");
            }
        }
        if (request.getAvatar() != null) {
            user.setAvatarUrl(request.getAvatar());
        }
        if (request.getCoverImage() != null) {
            user.setCoverUrl(request.getCoverImage());
        }

        String reqPhone = request.getPhoneNumber();
        if (reqPhone != null && !reqPhone.trim().isEmpty() && !reqPhone.equals(user.getPhoneNumber())) {
            throw new AppException(400,
                    "Số điện thoại không được phép thay đổi sau khi đăng ký");
        }
        if (request.getGender() != null) {
            user.setGender(UserProfile.Gender.values()[Math.min(Math.max(0, request.getGender()),
                    UserProfile.Gender.values().length - 1)]);
        }

        if (request.getDateOfBirth() != null) {
            user.setDateOfBirth(request.getDateOfBirth());
        }
        if (request.getBio() != null) {
            user.setBio(request.getBio());
        }

        UserProfile updatedUser = userProfileRepository.save(user);

        return UserDto.fromEntity(updatedUser);
    }

    @Override
    public void deleteUser(String id) {
        UserProfile user = userProfileRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("UserProfile not found with id: " + id));
        // Logic ban/delete user:
        // Cập nhật trạng thái trong user-service
        user.setStatus(UserProfile.UserStatus.BANNED);
        userProfileRepository.save(user);

        // Phát sự kiện sang auth-service để ban account
        rabbitMQPublisher.publishUserBannedEvent(id, "Banned by Admin manually from Dashboard");
    }

    @Override
    public void unbanUser(String id) {
        UserProfile user = userProfileRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("UserProfile not found with id: " + id));

        user.setStatus(UserProfile.UserStatus.ACTIVE);
        userProfileRepository.save(user);

        // Phát sự kiện sang auth-service để activate account lại
        rabbitMQPublisher.publishUserUnbannedEvent(id);
    }

    @Override
    public Page<UserDto> searchUsersDynamic(String fullName, String email, String phoneNumber, Pageable pageable) {
        return userProfileRepository.searchUsersDynamic(fullName, email, phoneNumber, pageable)
                .map(UserDto::fromEntity);
    }

    @Override
    public Page<UserDto> searchAdminUsers(String keyword, String statusStr, Pageable pageable) {
        UserProfile.UserStatus status = null;
        if (statusStr != null && !statusStr.isBlank()) {
            try {
                status = UserProfile.UserStatus.valueOf(statusStr.toUpperCase());
            } catch (IllegalArgumentException e) {
                // Ignore invalid status mapping or throw exception
            }
        }
        return userProfileRepository.searchAdminUsers(keyword, status, pageable)
                .map(UserDto::fromEntity);
    }

    @Override
    public UserDto updateAvatarOrCover(String id, MultipartFile file, boolean isAvatar) throws IOException {
        UserProfile user = userProfileRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("UserProfile not found with id: " + id));

        String oldUrl = isAvatar ? user.getAvatarUrl() : user.getCoverUrl();
        boolean isDefault = DEFAULT_AVATAR_URL.equals(oldUrl) || DEFAULT_COVER_URL.equals(oldUrl);
        if (oldUrl != null && !oldUrl.isEmpty() && !isDefault) {
            s3Service.deleteFile(oldUrl);
        }

        String folderName = isAvatar ? "avatars" : "covers";
        String newUrl = s3Service.uploadFile(file, folderName);

        if (isAvatar) {
            user.setAvatarUrl(newUrl);
        } else {
            user.setCoverUrl(newUrl);
        }

        return UserDto.fromEntity(userProfileRepository.save(user));
    }

    @Override
    public List<UserDto> getUsersByIds(List<String> ids) {
        return userProfileRepository.findAllById(ids).stream()
                .map(UserDto::fromEntity)
                .toList();
    }

    @Override
    public UserQuickStatsResponse getQuickStats() {
        long totalUsers = userProfileRepository.count();
        LocalDateTime startOfToday = LocalDate.now().atStartOfDay();
        long newToday = userProfileRepository.countByCreatedAtAfter(startOfToday);
        long bannedUsers = userProfileRepository.countByStatus(UserProfile.UserStatus.BANNED);
        long onlineNow = userProfileRepository.countByIsOnline(true);

        return UserQuickStatsResponse.builder()
                .totalUsers(totalUsers)
                .newToday(newToday)
                .onlineNow(onlineNow)
                .bannedUsers(bannedUsers)
                .build();
    }

    @Override
    public Map<String, Long> getGrowthStats(int days) {
        LocalDateTime startDate = LocalDateTime.now().minusDays(days);
        List<Object[]> results = userProfileRepository.getRegistrationStats(startDate);

        Map<String, Long> stats = new LinkedHashMap<>();
        for (Object[] row : results) {
            String date = row[0].toString();
            Long count = ((Number) row[1]).longValue();
            stats.put(date, count);
        }
        return stats;
    }

    @Override
    public List<String> getAllUserIds() {
        return userProfileRepository.findAll().stream()
                .map(UserProfile::getId)
                .collect(Collectors.toList());
    }
}
