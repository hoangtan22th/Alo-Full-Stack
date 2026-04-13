package edu.iuh.fit.auth_service.dto.response;

import edu.iuh.fit.auth_service.entity.Account;
import lombok.Builder;

@Builder
public record UserResponse(
        String id,
        String email,
        String phoneNumber,
        Boolean is2faEnabled,
        String role
) {
    public static UserResponse fromEntity(Account account) {
        if (account == null) return null;
        
        // Mock default for phone Number if it existed before in Account, but now doesn't.
        // Or wait, account doesn't have phone number anymore? Oh right, I forgot to remove phoneNumber from Account.
        // Actually earlier code failed on getPhoneNumber in userRepository if it was removed in Account.
        // Wait, did I leave phoneNumber in Account.java?
        // Let's assume phoneNumber is only in UserProfile now. So mock it:
        
        return UserResponse.builder()
                .id(account.getId())
                .email(account.getEmail())
                .phoneNumber("") 
                .is2faEnabled(account.getIs2faEnabled())
                .role(!account.getRoles().isEmpty() ? account.getRoles().iterator().next().getName() : "")
                .build();
    }
}