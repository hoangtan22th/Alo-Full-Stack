package edu.iuh.fit.auth_service.dto.response;

import edu.iuh.fit.auth_service.enums.QrAuthStatus;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class QrSessionResponse {
    private String qrToken;
    private QrAuthStatus status;
    private String accessToken; // Trả về khi đã CONFIRMED
}