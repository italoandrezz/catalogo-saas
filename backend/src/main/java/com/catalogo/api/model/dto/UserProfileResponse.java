package com.catalogo.api.model.dto;

import java.util.UUID;

public record UserProfileResponse(
        UUID id,
        String name,
        String email,
        String role,
        UUID tenantId
) {}
