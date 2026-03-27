package com.catalogo.api.service;

import com.catalogo.api.model.entity.Tenant;
import com.catalogo.api.model.entity.User;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class CurrentTenantService {

    public Tenant getCurrentTenant() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            throw new IllegalStateException("No authentication found in security context");
        }
        Object principal = authentication.getPrincipal();
        if (!(principal instanceof User user)) {
            throw new IllegalStateException("Authenticated user not available in security context");
        }
        return user.getTenant();
    }
}
