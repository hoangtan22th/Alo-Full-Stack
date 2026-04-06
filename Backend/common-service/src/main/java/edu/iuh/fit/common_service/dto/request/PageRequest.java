package edu.iuh.fit.common_service.dto.request;

import lombok.Data;

@Data
public class PageRequest {
    private int page = 0;
    private int size = 20;
    private String sortBy = "createdAt";
    private String sortDir = "desc";
}
