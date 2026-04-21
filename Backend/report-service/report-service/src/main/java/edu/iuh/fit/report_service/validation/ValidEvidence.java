package edu.iuh.fit.report_service.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Documented
@Constraint(validatedBy = ValidEvidenceValidator.class)
@Target({ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidEvidence {

    String message() default "Message IDs must contain between 3 and 40 items if provided. At least one type of evidence (description, images, or messages) is required.";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
