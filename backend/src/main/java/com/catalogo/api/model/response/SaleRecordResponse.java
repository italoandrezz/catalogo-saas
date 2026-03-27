package com.catalogo.api.model.response;

import com.catalogo.api.model.entity.Product;
import java.time.LocalDateTime;
import java.util.UUID;

public record SaleRecordResponse(
    UUID saleId,
    Product product,
    Integer quantityRemoved,
    String leadName,
    String leadPhone,
    LocalDateTime timestamp
) {
}
