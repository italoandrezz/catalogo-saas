package com.catalogo.api.controller;

import com.catalogo.api.model.dto.ProductRequest;
import com.catalogo.api.model.dto.ProductVisibilityRequest;
import com.catalogo.api.model.entity.Product;
import com.catalogo.api.model.request.StockAdjustmentRequest;
import com.catalogo.api.model.request.SaleRecordRequest;
import com.catalogo.api.model.request.StockSetRequest;
import com.catalogo.api.model.response.SaleRecordResponse;
import com.catalogo.api.service.ProductService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Product>> listAll() {
        return ResponseEntity.ok(productService.listAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Product> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(productService.findById(id));
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Product> create(@Valid @RequestBody ProductRequest request) {
        return ResponseEntity.ok(productService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Product> update(@PathVariable UUID id, @Valid @RequestBody ProductRequest request) {
        return ResponseEntity.ok(productService.update(id, request));
    }

    @PatchMapping("/{id}/visibility")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Product> updateVisibility(@PathVariable UUID id, @Valid @RequestBody ProductVisibilityRequest request) {
        return ResponseEntity.ok(productService.updateVisibility(id, request.active()));
    }

    @PatchMapping("/{id}/stock/add")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Product> addStock(@PathVariable UUID id, @Valid @RequestBody StockAdjustmentRequest request) {
        return ResponseEntity.ok(productService.addStock(id, request.quantity()));
    }

    @PatchMapping("/{id}/stock/remove")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Product> removeStock(@PathVariable UUID id, @Valid @RequestBody StockAdjustmentRequest request) {
        return ResponseEntity.ok(productService.removeStock(id, request.quantity()));
    }

    @PatchMapping("/{id}/stock/set")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Product> setStock(@PathVariable UUID id, @Valid @RequestBody StockSetRequest request) {
        return ResponseEntity.ok(productService.setStock(id, request.quantity()));
    }

    @PostMapping("/{id}/sales")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<SaleRecordResponse> recordSale(@PathVariable UUID id, @Valid @RequestBody SaleRecordRequest request) {
        return ResponseEntity.ok(productService.recordSale(id, request.quantity(), request.leadName(), request.leadPhone()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        productService.deactivate(id);
        return ResponseEntity.noContent().build();
    }
}
