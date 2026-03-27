package com.catalogo.api.controller;

import com.catalogo.api.model.entity.Product;
import com.catalogo.api.model.response.SaleRecordResponse;
import com.catalogo.api.security.JwtAuthFilter;
import com.catalogo.api.service.ProductService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ProductController.class)
@AutoConfigureMockMvc(addFilters = false)
class ProductControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ProductService productService;

    @MockBean
    private JwtAuthFilter jwtAuthFilter;

    @Test
    void updateVisibilityShouldReturnUpdatedProduct() throws Exception {
        UUID id = UUID.randomUUID();
        Product updated = new Product();
        updated.setId(id);
        updated.setName("Keyboard");
        updated.setActive(false);
        updated.setStock(10);

        when(productService.updateVisibility(eq(id), eq(false))).thenReturn(updated);

        mockMvc.perform(patch("/api/products/{id}/visibility", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new VisibilityBody(false))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.name").value("Keyboard"))
                .andExpect(jsonPath("$.active").value(false));

        verify(productService).updateVisibility(id, false);
    }

    @Test
    void deleteShouldReturnNoContent() throws Exception {
        UUID id = UUID.randomUUID();

        mockMvc.perform(delete("/api/products/{id}", id))
                .andExpect(status().isNoContent());

        verify(productService).deactivate(id);
    }

    @Test
    void recordSaleShouldReturnPersistedReceipt() throws Exception {
        UUID id = UUID.randomUUID();
        UUID saleId = UUID.randomUUID();

        Product product = new Product();
        product.setId(id);
        product.setName("Keyboard");
        product.setStock(8);

        SaleRecordResponse response = new SaleRecordResponse(
            saleId,
            product,
            2,
            "Cliente",
            "(11) 91234-5678",
            LocalDateTime.now()
        );

        when(productService.recordSale(eq(id), eq(2), eq("Cliente"), eq("(11) 91234-5678")))
            .thenReturn(response);

        mockMvc.perform(post("/api/products/{id}/sales", id)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new SaleBody(2, "Cliente", "(11) 91234-5678"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.saleId").value(saleId.toString()))
            .andExpect(jsonPath("$.quantityRemoved").value(2))
            .andExpect(jsonPath("$.product.id").value(id.toString()));

        verify(productService).recordSale(id, 2, "Cliente", "(11) 91234-5678");
    }

    private record VisibilityBody(boolean active) {
    }

    private record SaleBody(int quantity, String leadName, String leadPhone) {
    }
}
