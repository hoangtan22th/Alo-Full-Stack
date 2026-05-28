package edu.iuh.fit.report_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportStatisticsResponse {

    private Overview overview;
    private List<DataPoint> byReason;
    private List<DataPoint> byTargetType;
    private List<OffenderInfo> topOffenders;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Overview {
        private long totalPending;
        private long resolvedToday;
        private long totalBanned;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DataPoint {
        private String name;
        private long value;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OffenderInfo {
        private String targetId;
        private String targetName;
        private String targetType;
        private long pendingCount;
    }
}
