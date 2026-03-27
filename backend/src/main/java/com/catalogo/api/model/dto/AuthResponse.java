package com.catalogo.api.model.dto;

import java.util.UUID;

public record AuthResponse(
        String token,
        String name,
        String email,
        String role,
        UUID tenantId
) {}
