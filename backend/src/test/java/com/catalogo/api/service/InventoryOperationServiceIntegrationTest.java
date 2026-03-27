package com.catalogo.api.service;

import com.catalogo.api.model.entity.InventoryOperation;
import com.catalogo.api.model.entity.Product;
import com.catalogo.api.model.entity.Tenant;
import com.catalogo.api.model.entity.User;
import com.catalogo.api.model.response.InventoryOperationResponse;
import com.catalogo.api.repository.InventoryOperationRepository;
import com.catalogo.api.repository.ProductRepository;
import com.catalogo.api.repository.TenantRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest(
    properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.datasource.url=jdbc:h2:mem:catalogo-inventory-it;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "JWT_SECRET=test-secret-for-integration-tests-1234567890"
    }
)
class InventoryOperationServiceIntegrationTest {

    @Autowired
    private InventoryOperationService inventoryOperationService;

    @Autowired
    private TenantRepository tenantRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private InventoryOperationRepository inventoryOperationRepository;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void listOperationsShouldReturnProductDataWithoutLazyInitializationException() {
        Tenant tenant = new Tenant();
        tenant.setName("Tenant IT");
        tenant.setEmail("tenant-it@example.com");
        tenant = tenantRepository.save(tenant);

        Product product = new Product();
        product.setTenant(tenant);
        product.setName("Mouse Gamer");
        product.setStock(20);
        product = productRepository.save(product);

        InventoryOperation operation = new InventoryOperation();
        operation.setTenant(tenant);
        operation.setProduct(product);
        operation.setType("add");
        operation.setQuantity(5);
        operation.setPreviousQuantity(15);
        inventoryOperationRepository.save(operation);

        User user = new User();
        user.setTenant(tenant);
        user.setEmail("admin@example.com");
        user.setPassword("secret");
        user.setRole("ADMIN");
        user.setActive(true);

        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities()));
        SecurityContextHolder.setContext(context);

        List<InventoryOperationResponse> responses = assertDoesNotThrow(
            () -> inventoryOperationService.listOperations(null)
        );

        assertEquals(1, responses.size());
        assertEquals("Mouse Gamer", responses.get(0).productName());
        assertEquals(product.getId(), responses.get(0).productId());
        assertEquals("add", responses.get(0).type());
    }
}
