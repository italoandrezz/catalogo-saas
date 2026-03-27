package com.catalogo.api.model.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record StockSetRequest(
    @NotNull(message = "Quantity is required")
    @Min(value = 0, message = "Quantity must be zero or greater")
    Integer quantity
) {
}
