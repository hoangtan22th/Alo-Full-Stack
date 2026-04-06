package edu.iuh.fit.common_service.exception;

public class DuplicateResourceException extends AppException {

    public DuplicateResourceException(String message) {
        super(409, message);
    }
}