package com.catalogo.api.model.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CustomerRequest(
        @NotBlank String name,
        @NotBlank(message = "Email is required")
        @Email(message = "Email must be valid")
        @Size(max = 150, message = "Email must have at most 150 characters")
        String email,
        @NotBlank(message = "Phone is required")
        @Pattern(
                regexp = "^\\+55 \\(\\d{2}\\) \\d{4,5}-\\d{4}$",
                message = "Phone must follow the format +55 (11) 91234-5678"
        )
        String phone
) {
}
