package edu.iuh.fit.report_service.validation;

import edu.iuh.fit.report_service.dto.request.ReportCreationRequest;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.util.List;

public class ValidEvidenceValidator implements ConstraintValidator<ValidEvidence, ReportCreationRequest> {

    @Override
    public boolean isValid(ReportCreationRequest request, ConstraintValidatorContext context) {
        if (request == null) {
            return false;
        }

        boolean hasDescription = request.getDescription() != null && !request.getDescription().trim().isEmpty();
        boolean hasImages = request.getImageUrls() != null && !request.getImageUrls().isEmpty();
        boolean hasMessages = request.getMessageIds() != null && !request.getMessageIds().isEmpty();

        // Must have at least one type of evidence
        if (!hasDescription && !hasImages && !hasMessages) {
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate("At least one piece of evidence (description, images, or messages) is required")
                    .addConstraintViolation();
            return false;
        }

        // Apply 3 to 40 messageIds rule if present
        if (hasMessages) {
            List<Long> messages = request.getMessageIds();
            if (messages.size() < 3 || messages.size() > 40) {
                context.disableDefaultConstraintViolation();
                context.buildConstraintViolationWithTemplate("Message IDs must contain between 3 and 40 items")
                        .addConstraintViolation();
                return false;
            }
        }

        return true;
    }
}
