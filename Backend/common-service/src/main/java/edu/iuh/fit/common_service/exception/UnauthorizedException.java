package edu.iuh.fit.common_service.exception;

public class UnauthorizedException extends AppException {

    public UnauthorizedException(String message) {
        super(401, message);
    }

    public UnauthorizedException() {
        super(401, "Bạn chưa đăng nhập hoặc phiên làm việc đã hết hạn!");
    }
}