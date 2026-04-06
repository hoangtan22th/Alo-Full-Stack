package edu.iuh.fit.contact_service.client;

import edu.iuh.fit.common_service.dto.response.ApiResponse;
import edu.iuh.fit.contact_service.dto.response.UserDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(name = "user-service")
public interface UserClient {

    // Gọi sang API của User Service để lấy thông tin (ID, Tên, Avatar)
    @GetMapping("/api/users/search")
    ApiResponse<UserDTO> getUserByPhone(@RequestParam("phone") String phone);
}