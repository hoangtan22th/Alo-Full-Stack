package edu.iuh.fit.contact_service.dto.response;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserDTO {
    private String id;
    private String email;
    private String fullName;
    private String phoneNumber;
    private String avatar;
}