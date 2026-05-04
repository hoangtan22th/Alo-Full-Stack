package edu.iuh.fit.report_service.aspect;

import edu.iuh.fit.report_service.dto.request.ReportCreationRequest;
import edu.iuh.fit.common_service.exception.RateLimitException;
import lombok.RequiredArgsConstructor;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Aspect
@Component
@RequiredArgsConstructor
public class RateLimitAspect {

    private final StringRedisTemplate redisTemplate;

    @Before("execution(* edu.iuh.fit.report_service.controller.ReportController.createReport(..)) && args(request)")
    public void checkRateLimit(ReportCreationRequest request) {
        String reporterId = request.getReporterId();
        String targetId = request.getTargetId();

        // 1. Target Limit (Max 1/day per target)
        String targetKey = String.format("rate:report_target:%s:%s:day", reporterId, targetId);
        checkAndIncr(targetKey, 1, Duration.ofDays(1), "DUPLICATE_TARGET");

        // 2. Hourly Limit (Max 5/hour)
        String hourKey = String.format("rate:report:%s:hour", reporterId);
        checkAndIncr(hourKey, 5, Duration.ofHours(1), "HOURLY_LIMIT");

        // 3. Daily Limit (Max 20/day)
        String dayKey = String.format("rate:report:%s:day", reporterId);
        checkAndIncr(dayKey, 20, Duration.ofDays(1), "DAILY_LIMIT");
    }

    private void checkAndIncr(String key, int limit, Duration ttl, String reason) {
        Long count = redisTemplate.opsForValue().increment(key);
        
        if (count != null && count == 1) {
            redisTemplate.expire(key, ttl);
        }

        if (count != null && count > limit) {
            Long expire = redisTemplate.getExpire(key);
            throw new RateLimitException(reason, expire != null ? expire : ttl.getSeconds());
        }
    }
}
