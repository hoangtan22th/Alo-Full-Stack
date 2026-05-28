package edu.iuh.fit.report_service.config;

import feign.RequestInterceptor;
import feign.RequestTemplate;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * Feign configuration that relays the incoming JWT Bearer token to
 * downstream services (e.g., user-service) called via FeignClient.
 *
 * Without this, Feign sends requests without Authorization headers,
 * causing user-service's security filter to reject the call with 401/403/500.
 */
@Configuration
public class FeignConfig {

    private static final Logger log = LoggerFactory.getLogger(FeignConfig.class);

    @Bean
    public RequestInterceptor bearerTokenRelayInterceptor() {
        return new RequestInterceptor() {
            @Override
            public void apply(RequestTemplate template) {
                try {
                    ServletRequestAttributes attributes =
                            (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();

                    if (attributes == null) {
                        log.debug("[FeignConfig] No active request context — cannot relay Authorization header.");
                        return;
                    }

                    HttpServletRequest request = attributes.getRequest();
                    String authorizationHeader = request.getHeader("Authorization");

                    if (authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
                        template.header("Authorization", authorizationHeader);
                        log.debug("[FeignConfig] Relayed Authorization header to downstream request: {}",
                                template.url());
                    } else {
                        log.warn("[FeignConfig] No Bearer token found in incoming request. " +
                                "Downstream call to {} may fail with 401.", template.url());
                    }
                } catch (Exception e) {
                    // Never let interceptor failures crash the request
                    log.error("[FeignConfig] Error in bearerTokenRelayInterceptor: {}", e.getMessage());
                }
            }
        };
    }
}
