package edu.iuh.fit.dto.response;

import edu.iuh.fit.entity.UserProfile;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class UserDto {

    private String id;
    private String email;
    private String fullName;
    private String firstName;
    private String lastName;
    private String phoneNumber;
    private String avatar;
    private String coverImage;
    private String gender;
    private java.time.LocalDate dateOfBirth;
    private Boolean isOnline;
    private Boolean isBanned;
    private LocalDateTime lastActive;
    private LocalDateTime createdAt;
    private String bio;
    private String timezone;
    private String locale;

    public static UserDto fromEntity(UserProfile profile) {
        if (profile == null) {
            return null;
        }

        String fullName = "";
        if (profile.getFirstName() != null) {
            fullName += profile.getFirstName() + " ";
        }
        if (profile.getLastName() != null) {
            fullName += profile.getLastName();
        }

        return UserDto.builder()
                .id(profile.getId())
                .email(profile.getEmail())
                .firstName(profile.getFirstName())
                .lastName(profile.getLastName())
                .fullName(fullName.trim())
                .phoneNumber(profile.getPhoneNumber())
                .avatar(profile.getAvatarUrl())
                .coverImage(profile.getCoverUrl())
                .gender(profile.getGender() != null ? profile.getGender().name() : null)
                .dateOfBirth(profile.getDateOfBirth())
                .isOnline(profile.getIsOnline())
                .isBanned(profile.getStatus() == UserProfile.UserStatus.BANNED)
                .lastActive(profile.getLastActiveAt())
                .createdAt(profile.getCreatedAt())
                .bio(profile.getBio())
                .timezone(profile.getTimezone())
                .locale(profile.getLocale())
                .build();
    }
}
