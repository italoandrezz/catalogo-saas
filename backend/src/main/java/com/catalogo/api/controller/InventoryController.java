package com.catalogo.api.controller;

import com.catalogo.api.model.response.InventoryOperationResponse;
import com.catalogo.api.service.InventoryOperationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/inventory")
@RequiredArgsConstructor
public class InventoryController {

    private final InventoryOperationService inventoryOperationService;

    @GetMapping("/operations")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<InventoryOperationResponse>> listOperations(
        @RequestParam(required = false) String type
    ) {
        return ResponseEntity.ok(inventoryOperationService.listOperations(type));
    }
}
