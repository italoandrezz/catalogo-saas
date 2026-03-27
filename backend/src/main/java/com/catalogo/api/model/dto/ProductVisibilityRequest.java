package com.catalogo.api.model.dto;

import jakarta.validation.constraints.NotNull;

public record ProductVisibilityRequest(
        @NotNull(message = "Active flag is required")
        Boolean active
) {
}
