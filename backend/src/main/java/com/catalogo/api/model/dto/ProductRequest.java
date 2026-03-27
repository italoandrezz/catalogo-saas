package com.catalogo.api.model.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public record ProductRequest(
        @NotBlank String name,
        String description,
        @NotNull(message = "Price is required")
        @DecimalMin(value = "0.01", message = "Price must be greater than zero")
        BigDecimal price,
        @Min(value = 0, message = "Stock must be zero or greater")
        Integer stock,
        String imageUrl,
        String imageGallery,
        String variations,
        Boolean badgeNew,
        Boolean badgePromo,
        Boolean badgeBestSeller,
        Integer discountPercent,
        @NotNull(message = "Category is required")
        UUID categoryId
) {
}
