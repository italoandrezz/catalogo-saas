package com.catalogo.api.service;

import com.catalogo.api.exception.ResourceNotFoundException;
import com.catalogo.api.model.dto.CategoryRequest;
import com.catalogo.api.model.entity.Category;
import com.catalogo.api.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final CurrentTenantService currentTenantService;

    public List<Category> listAll() {
        UUID tenantId = currentTenantService.getCurrentTenant().getId();
        return categoryRepository.findByTenantId(tenantId);
    }

    public Category create(CategoryRequest request) {
        Category category = new Category();
        category.setTenant(currentTenantService.getCurrentTenant());
        category.setName(request.name());
        category.setDescription(request.description());
        return categoryRepository.save(category);
    }

    public Category update(UUID id, CategoryRequest request) {
        UUID tenantId = currentTenantService.getCurrentTenant().getId();
        Category category = categoryRepository.findById(id)
                .filter(item -> item.getTenant().getId().equals(tenantId))
            .orElseThrow(() -> new ResourceNotFoundException("Category not found"));

        category.setName(request.name());
        category.setDescription(request.description());
        return categoryRepository.save(category);
    }

    public void delete(UUID id) {
        UUID tenantId = currentTenantService.getCurrentTenant().getId();
        Category category = categoryRepository.findById(id)
                .filter(item -> item.getTenant().getId().equals(tenantId))
            .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
        categoryRepository.delete(category);
    }
}
