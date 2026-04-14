package edu.iuh.fit.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserRegisteredEvent implements Serializable {
    private String id;
    private String email;
    private String fullName;
    private String phoneNumber;
    private String avatarUrl;
    private String coverUrl;
    private Integer gender;
}
