package edu.iuh.fit.contact_service.dto.response;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RelationStatusResponseDTO {
    private String relationStatus; // SELF, ACCEPTED, YOU_SENT_REQUEST, THEY_SENT_REQUEST, NOT_FRIEND
    private String friendshipId;
}
