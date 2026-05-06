package edu.iuh.fit.common_service.exception;

import lombok.Getter;

@Getter
public class RateLimitException extends RuntimeException {
    private final String reason;
    private final long retryAfter;

    public RateLimitException(String reason, long retryAfter) {
        super("Rate limit exceeded: " + reason);
        this.reason = reason;
        this.retryAfter = retryAfter;
    }
}
