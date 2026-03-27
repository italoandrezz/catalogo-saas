package com.catalogo.api.repository;

import com.catalogo.api.model.entity.InventoryOperation;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface InventoryOperationRepository extends JpaRepository<InventoryOperation, UUID> {

    @EntityGraph(attributePaths = "product")
    List<InventoryOperation> findTop100ByTenantIdOrderByCreatedAtDesc(UUID tenantId);

    @EntityGraph(attributePaths = "product")
    List<InventoryOperation> findTop100ByTenantIdAndTypeOrderByCreatedAtDesc(UUID tenantId, String type);
}
