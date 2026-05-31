package edu.iuh.fit.report_service.aspect;

import edu.iuh.fit.report_service.dto.request.ReportCreationRequest;
import edu.iuh.fit.common_service.exception.RateLimitException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Aspect
@Component
@RequiredArgsConstructor
@Slf4j
public class RateLimitAspect {

    private final StringRedisTemplate redisTemplate;

    @Before("execution(* edu.iuh.fit.report_service.controller.ReportController.createReport(..)) && args(request)")
    public void checkRateLimit(ReportCreationRequest request) {
        try {
            String reporterId = request.getReporterId();
            if (reporterId != null && reporterId.equalsIgnoreCase("SYSTEM")) {
                return; // Skip rate limiting for automated AI system reports
            }
            
            String targetId = request.getTargetId();

            // 1. Target Limit (Max 5/day per target for testing)
            String targetKey = String.format("rate:report_target:%s:%s:day", reporterId, targetId);
            checkAndIncr(targetKey, 5, Duration.ofDays(1), "DUPLICATE_TARGET");

            // 2. Hourly Limit (Max 50/hour for testing)
            String hourKey = String.format("rate:report:%s:hour", reporterId);
            checkAndIncr(hourKey, 50, Duration.ofHours(1), "HOURLY_LIMIT");

            // 3. Daily Limit (Max 200/day for testing)
            String dayKey = String.format("rate:report:%s:day", reporterId);
            checkAndIncr(dayKey, 200, Duration.ofDays(1), "DAILY_LIMIT");
        } catch (RateLimitException e) {
            throw e; // Re-throw actual rate limit exceptions
        } catch (Exception e) {
            log.error("Redis sync error during rate limiting for report creation: {}", e.getMessage());
            // Fail-open: allow the report to proceed even if Redis is down
        }
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
