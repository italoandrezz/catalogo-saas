package com.catalogo.api.service;

import com.catalogo.api.exception.ResourceNotFoundException;
import com.catalogo.api.model.dto.ProductRequest;
import com.catalogo.api.model.entity.Category;
import com.catalogo.api.model.entity.InventoryOperation;
import com.catalogo.api.model.entity.Product;
import com.catalogo.api.model.response.SaleRecordResponse;
import com.catalogo.api.repository.CategoryRepository;
import com.catalogo.api.repository.InventoryOperationRepository;
import com.catalogo.api.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final InventoryOperationRepository inventoryOperationRepository;
    private final CurrentTenantService currentTenantService;

    public List<Product> listAll() {
        UUID tenantId = currentTenantService.getCurrentTenant().getId();
        return productRepository.findByTenantIdWithCategory(tenantId);
    }

    public Product findById(UUID id) {
        UUID tenantId = currentTenantService.getCurrentTenant().getId();
        return productRepository.findById(id)
                .filter(product -> product.getTenant().getId().equals(tenantId))
                .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
    }

    public Product create(ProductRequest request) {
        Product product = new Product();
        product.setTenant(currentTenantService.getCurrentTenant());
        applyProductData(product, request);
        return productRepository.save(product);
    }

    public Product update(UUID id, ProductRequest request) {
        Product product = findById(id);
        applyProductData(product, request);
        return productRepository.save(product);
    }

    public void deactivate(UUID id) {
        Product product = findById(id);
        productRepository.delete(product);
    }

    public Product updateVisibility(UUID id, boolean active) {
        Product product = findById(id);
        product.setActive(active);
        return productRepository.save(product);
    }

    public Product addStock(UUID id, Integer quantity) {
        if (quantity == null || quantity <= 0) {
            throw new IllegalArgumentException("Quantity must be greater than 0");
        }
        Product product = findById(id);
        int previousQuantity = product.getStock();
        product.setStock(product.getStock() + quantity);
        Product updated = productRepository.save(product);
        recordOperation(updated, "add", quantity, previousQuantity, null, null, null, null);
        return updated;
    }

    public Product removeStock(UUID id, Integer quantity) {
        if (quantity == null || quantity <= 0) {
            throw new IllegalArgumentException("Quantity must be greater than 0");
        }
        Product product = findById(id);
        if (product.getStock() < quantity) {
            throw new IllegalArgumentException("Insufficient stock: " + product.getStock() + " available, " + quantity + " requested");
        }
        int previousQuantity = product.getStock();
        product.setStock(product.getStock() - quantity);
        Product updated = productRepository.save(product);
        recordOperation(updated, "remove", quantity, previousQuantity, null, null, null, null);
        return updated;
    }

    public SaleRecordResponse recordSale(UUID id, Integer quantity, String leadName, String leadPhone) {
        if (quantity == null || quantity <= 0) {
            throw new IllegalArgumentException("Quantity must be greater than 0");
        }
        Product product = findById(id);
        if (product.getStock() < quantity) {
            throw new IllegalArgumentException("Insufficient stock: " + product.getStock() + " available, " + quantity + " requested");
        }

        int previousQuantity = product.getStock();
        product.setStock(product.getStock() - quantity);
        Product updated = productRepository.save(product);

        UUID saleId = UUID.randomUUID();
        InventoryOperation operation = recordOperation(
            updated,
            "remove",
            quantity,
            previousQuantity,
            leadName,
            leadPhone,
            saleId,
            null
        );

        return new SaleRecordResponse(
            saleId,
            updated,
            quantity,
            leadName,
            leadPhone,
            operation.getCreatedAt() != null ? operation.getCreatedAt() : LocalDateTime.now()
        );
    }

    public Product setStock(UUID id, Integer quantity) {
        if (quantity == null || quantity < 0) {
            throw new IllegalArgumentException("Quantity must be zero or greater");
        }
        Product product = findById(id);
        int previousQuantity = product.getStock();
        product.setStock(quantity);
        Product updated = productRepository.save(product);
        recordOperation(updated, "adjust", quantity, previousQuantity, null, null, null, null);
        return updated;
    }

    private InventoryOperation recordOperation(
        Product product,
        String type,
        Integer quantity,
        Integer previousQuantity,
        String leadName,
        String leadPhone,
        UUID saleId,
        LocalDateTime createdAt
    ) {
        InventoryOperation operation = new InventoryOperation();
        operation.setTenant(product.getTenant());
        operation.setProduct(product);
        operation.setType(type);
        operation.setQuantity(quantity);
        operation.setPreviousQuantity(previousQuantity);
        operation.setLeadName(leadName);
        operation.setLeadPhone(leadPhone);
        operation.setSaleId(saleId);
        if (createdAt != null) {
            operation.setCreatedAt(createdAt);
        }
        return inventoryOperationRepository.save(operation);
    }

    private void applyProductData(Product product, ProductRequest request) {
        UUID tenantId = currentTenantService.getCurrentTenant().getId();

        product.setName(request.name());
        product.setDescription(request.description());
        product.setPrice(request.price());
        product.setStock(request.stock() != null ? request.stock() : 0);
        product.setImageUrl(request.imageUrl());
        product.setImageGallery(request.imageGallery());
        product.setVariations(request.variations());
        product.setBadgeNew(Boolean.TRUE.equals(request.badgeNew()));
        product.setBadgePromo(Boolean.TRUE.equals(request.badgePromo()));
        product.setBadgeBestSeller(Boolean.TRUE.equals(request.badgeBestSeller()));
        product.setDiscountPercent(request.discountPercent() != null ? request.discountPercent() : 0);

        Category category = categoryRepository.findById(request.categoryId())
                .filter(item -> item.getTenant().getId().equals(tenantId))
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
        product.setCategory(category);
    }
}
