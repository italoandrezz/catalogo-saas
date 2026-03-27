package com.catalogo.api.controller;

import com.catalogo.api.model.entity.Product;
import com.catalogo.api.repository.ProductRepository;
import com.catalogo.api.repository.TenantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/public")
@RequiredArgsConstructor
public class PublicCatalogController {

    private final ProductRepository productRepository;
    private final TenantRepository tenantRepository;

    @GetMapping("/{tenantId}/products")
    public ResponseEntity<List<Product>> listPublicProducts(@PathVariable UUID tenantId) {
        if (!tenantRepository.existsById(tenantId)) {
            return ResponseEntity.notFound().build();
        }
        List<Product> products = productRepository.findActiveByTenantIdWithCategory(tenantId).stream()
                .filter(product -> product.getStock() != null && product.getStock() > 0)
                .toList();
        return ResponseEntity.ok(products);
    }
}
