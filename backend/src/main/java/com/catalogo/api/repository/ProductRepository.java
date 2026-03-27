package com.catalogo.api.repository;

import com.catalogo.api.model.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface ProductRepository extends JpaRepository<Product, UUID> {

    @Query("""
            select p
            from Product p
            left join fetch p.category c
            where p.tenant.id = :tenantId
            """)
    List<Product> findByTenantIdWithCategory(@Param("tenantId") UUID tenantId);

        @Query("""
                        select p
                        from Product p
                        left join fetch p.category c
                        where p.tenant.id = :tenantId
                            and p.active = true
                        """)
        List<Product> findActiveByTenantIdWithCategory(@Param("tenantId") UUID tenantId);
}
