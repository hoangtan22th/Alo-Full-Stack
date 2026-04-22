package edu.iuh.fit.report_service.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.web.config.EnableSpringDataWebSupport;

/**
 * Fixes the Spring Boot warning:
 * "Serializing PageImpl instances as-is is not supported..."
 *
 * The VIA_DTO mode wraps PageImpl in a stable DTO structure that is safe
 * for JSON serialization and produces a predictable shape for the frontend.
 */
@Configuration
@EnableSpringDataWebSupport(
        pageSerializationMode = EnableSpringDataWebSupport.PageSerializationMode.VIA_DTO
)
public class WebConfig {
    // No additional beans needed — the annotation does all the work.
}
