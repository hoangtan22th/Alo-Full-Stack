package edu.iuh.fit.service.impl;

import edu.iuh.fit.dto.request.UserUpdateRequest;
import edu.iuh.fit.dto.response.UserDto;
import edu.iuh.fit.entity.UserProfile;
import edu.iuh.fit.repository.UserProfileRepository;
import edu.iuh.fit.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import edu.iuh.fit.service.S3Service;
import java.io.IOException;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserProfileRepository userProfileRepository;
    private final S3Service s3Service;

    @Override
    public UserDto getUserById(String id) {
        UserProfile user = userProfileRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("UserProfile not found with id: " + id));
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
        if (request.getAvatar() != null) user.setAvatarUrl(request.getAvatar());
        if (request.getCoverImage() != null) user.setCoverUrl(request.getCoverImage());
        if (request.getPhoneNumber() != null) user.setPhoneNumber(request.getPhoneNumber());
        
        if (request.getGender() != null) {
            user.setGender(UserProfile.Gender.values()[Math.min(Math.max(0, request.getGender()), UserProfile.Gender.values().length - 1)]);
        }
        
        if (request.getDateOfBirth() != null) user.setDateOfBirth(request.getDateOfBirth());
        if (request.getBio() != null) user.setBio(request.getBio());

        UserProfile updatedUser = userProfileRepository.save(user);
        return UserDto.fromEntity(updatedUser);
    }

    @Override
    public void deleteUser(String id) {
        UserProfile user = userProfileRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("UserProfile not found with id: " + id));
        // Soft delete logic should ideally be handled via Account, 
        // Here we just ignore or clear data
    }

    @Override
    public Page<UserDto> searchUsersDynamic(String fullName, String email, String phoneNumber, Pageable pageable) {
        return userProfileRepository.searchUsersDynamic(fullName, email, phoneNumber, pageable)
                .map(UserDto::fromEntity);
    }

    @Override
    public UserDto updateAvatarOrCover(String id, MultipartFile file, boolean isAvatar) throws IOException {
        UserProfile user = userProfileRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("UserProfile not found with id: " + id));

        String oldUrl = isAvatar ? user.getAvatarUrl() : user.getCoverUrl();
        if (oldUrl != null && !oldUrl.isEmpty()) {
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
}
