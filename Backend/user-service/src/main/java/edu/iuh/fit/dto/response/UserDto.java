package edu.iuh.fit.dto.response;

import edu.iuh.fit.entity.User;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class UserDto {
    private String id;
    private String email;
    private String fullName;
    private String phoneNumber;
    private String avatar;
    private String coverImage;
    private Integer gender;
    private java.time.LocalDate dateOfBirth;
    private Boolean isOnline;
    private Boolean isBanned;
    private LocalDateTime lastActive;
    private LocalDateTime createdAt;

    public static UserDto fromEntity(User user) {
        if (user == null) return null;
        return UserDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .phoneNumber(user.getPhoneNumber())
                .avatar(user.getAvatar())
                .coverImage(user.getCoverImage())
                .gender(user.getGender())
                .dateOfBirth(user.getDateOfBirth())
                .isOnline(user.getIsOnline())
                .isBanned(user.getIsBanned())
                .lastActive(user.getLastActive())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
