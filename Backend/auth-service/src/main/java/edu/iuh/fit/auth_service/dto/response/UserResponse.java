package edu.iuh.fit.auth_service.dto.response;

import edu.iuh.fit.auth_service.entity.User;
import lombok.Builder;
import java.time.LocalDate;

@Builder
public record UserResponse(
        String id,
        String email,
        String fullName,
        String phoneNumber,
        String avatar,
        String coverImage,
        Integer gender,
        LocalDate dateOfBirth,
        Boolean is2faEnabled,
        Boolean isOnline
) {
    public static UserResponse fromEntity(User user) {
        if (user == null) return null;
        return UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .phoneNumber(user.getPhoneNumber())
                .avatar(user.getAvatar())
                .coverImage(user.getCoverImage())
                .gender(user.getGender())
                .dateOfBirth(user.getDateOfBirth())
                .is2faEnabled(user.getIs2faEnabled())
                .isOnline(user.getIsOnline())
                .build();
    }
}