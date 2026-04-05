package edu.iuh.fit.common_service.exception;

public class ForbiddenException extends AppException {

    public ForbiddenException(String message) {
        super(403, message);
    }

    public ForbiddenException() {
        super(403, "Bạn không có quyền thực hiện hành động này!");
    }
}