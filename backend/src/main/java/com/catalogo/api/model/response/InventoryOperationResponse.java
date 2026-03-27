package com.catalogo.api.model.response;

import java.time.LocalDateTime;
import java.util.UUID;

public record InventoryOperationResponse(
    UUID id,
    UUID productId,
    String productName,
    String type,
    Integer quantity,
    Integer previousQuantity,
    String leadName,
    String leadPhone,
    UUID saleId,
    LocalDateTime timestamp
) {
}
