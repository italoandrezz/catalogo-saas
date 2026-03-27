package com.catalogo.api.controller;

import com.catalogo.api.model.entity.Product;
import com.catalogo.api.repository.ProductRepository;
import com.catalogo.api.repository.TenantRepository;
import com.catalogo.api.security.JwtAuthFilter;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PublicCatalogController.class)
@AutoConfigureMockMvc(addFilters = false)
class PublicCatalogControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ProductRepository productRepository;

    @MockBean
    private TenantRepository tenantRepository;

    @MockBean
    private JwtAuthFilter jwtAuthFilter;

    @Test
    void listPublicProductsShouldReturn404WhenTenantDoesNotExist() throws Exception {
        UUID tenantId = UUID.randomUUID();
        when(tenantRepository.existsById(eq(tenantId))).thenReturn(false);

        mockMvc.perform(get("/api/public/{tenantId}/products", tenantId))
                .andExpect(status().isNotFound());
    }

    @Test
    void listPublicProductsShouldFilterOutProductsWithoutStock() throws Exception {
        UUID tenantId = UUID.randomUUID();

        Product withStock = new Product();
        withStock.setId(UUID.randomUUID());
        withStock.setName("Visible product");
        withStock.setStock(5);
        withStock.setActive(true);

        Product noStock = new Product();
        noStock.setId(UUID.randomUUID());
        noStock.setName("Hidden product");
        noStock.setStock(0);
        noStock.setActive(true);

        when(tenantRepository.existsById(eq(tenantId))).thenReturn(true);
        when(productRepository.findActiveByTenantIdWithCategory(eq(tenantId))).thenReturn(List.of(withStock, noStock));

        mockMvc.perform(get("/api/public/{tenantId}/products", tenantId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].name").value("Visible product"))
                .andExpect(jsonPath("$[0].stock").value(5));
    }
}
