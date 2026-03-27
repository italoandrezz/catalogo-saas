package com.catalogo.api.controller;

import com.catalogo.api.model.response.InventoryOperationResponse;
import com.catalogo.api.security.JwtAuthFilter;
import com.catalogo.api.service.InventoryOperationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(InventoryController.class)
@AutoConfigureMockMvc(addFilters = false)
class InventoryControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private InventoryOperationService inventoryOperationService;

    @MockBean
    private JwtAuthFilter jwtAuthFilter;

    @Test
    void listOperationsShouldReturnData() throws Exception {
        InventoryOperationResponse response = new InventoryOperationResponse(
            UUID.randomUUID(),
            UUID.randomUUID(),
            "Keyboard",
            "add",
            5,
            10,
            null,
            null,
            null,
            LocalDateTime.now()
        );

        when(inventoryOperationService.listOperations(null)).thenReturn(List.of(response));

        mockMvc.perform(get("/api/inventory/operations"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].productName").value("Keyboard"))
            .andExpect(jsonPath("$[0].type").value("add"))
            .andExpect(jsonPath("$[0].quantity").value(5));

        verify(inventoryOperationService).listOperations(null);
    }

    @Test
    void listOperationsByTypeShouldApplyFilter() throws Exception {
        when(inventoryOperationService.listOperations(eq("remove"))).thenReturn(List.of());

        mockMvc.perform(get("/api/inventory/operations").param("type", "remove"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray());

        verify(inventoryOperationService).listOperations("remove");
    }

    @Test
    void listOperationsShouldReturn500WhenUnexpectedErrorHappens() throws Exception {
        when(inventoryOperationService.listOperations(null)).thenThrow(new RuntimeException("boom"));

        mockMvc.perform(get("/api/inventory/operations"))
            .andExpect(status().isInternalServerError())
            .andExpect(jsonPath("$.message").value("Unexpected internal error"))
            .andExpect(jsonPath("$.path").value("/api/inventory/operations"));
    }
}
