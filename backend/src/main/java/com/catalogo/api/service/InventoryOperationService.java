package com.catalogo.api.service;

import com.catalogo.api.model.entity.InventoryOperation;
import com.catalogo.api.model.response.InventoryOperationResponse;
import com.catalogo.api.repository.InventoryOperationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class InventoryOperationService {

    private final InventoryOperationRepository inventoryOperationRepository;
    private final CurrentTenantService currentTenantService;

    @Transactional(readOnly = true)
    public List<InventoryOperationResponse> listOperations(String type) {
        UUID tenantId = currentTenantService.getCurrentTenant().getId();
        List<InventoryOperation> operations;

        if (type == null || type.isBlank() || "all".equalsIgnoreCase(type)) {
            operations = inventoryOperationRepository.findTop100ByTenantIdOrderByCreatedAtDesc(tenantId);
        } else {
            operations = inventoryOperationRepository.findTop100ByTenantIdAndTypeOrderByCreatedAtDesc(
                tenantId,
                type.trim().toLowerCase(Locale.ROOT)
            );
        }

        return operations.stream()
            .map(this::toResponse)
            .toList();
    }

    private InventoryOperationResponse toResponse(InventoryOperation operation) {
        return new InventoryOperationResponse(
            operation.getId(),
            operation.getProduct().getId(),
            operation.getProduct().getName(),
            operation.getType(),
            operation.getQuantity(),
            operation.getPreviousQuantity(),
            operation.getLeadName(),
            operation.getLeadPhone(),
            operation.getSaleId(),
            operation.getCreatedAt()
        );
    }
}
