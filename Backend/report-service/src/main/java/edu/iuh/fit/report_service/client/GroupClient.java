package edu.iuh.fit.report_service.client;

import edu.iuh.fit.common_service.dto.response.ApiResponse;
import edu.iuh.fit.report_service.config.FeignConfig;
import edu.iuh.fit.report_service.dto.response.GroupResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(
        name = "group-service",
        configuration = FeignConfig.class
)
public interface GroupClient {

    @GetMapping("/api/v1/groups/{id}")
    GroupResponse getGroupById(@PathVariable("id") String id);
}
