package edu.iuh.fit.report_service.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GroupResponse {
    private GroupData data;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GroupData {
        @JsonProperty("_id")
        private String id;
        private String name;
        private String groupAvatar;
        private Boolean isGroup;
        private java.util.List<MemberData> members;

        @Data
        @NoArgsConstructor
        @AllArgsConstructor
        public static class MemberData {
            private String userId;
            private String role;
        }
    }
}
