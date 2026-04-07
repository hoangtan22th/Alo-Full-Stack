package edu.iuh.fit.dto.request;

import lombok.Data;

@Data
public class UserUpdateRequest {
    private String fullName;
    private String avatar;
    private String coverImage;
    private Integer gender;
    private java.time.LocalDate dateOfBirth;
}
