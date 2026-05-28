package edu.iuh.fit.report_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {
    private String id;
    private String fullName;
    private String firstName;
    private String lastName;
    private String avatar;
    // other fields if needed, Feign will ignore unknown fields
}
