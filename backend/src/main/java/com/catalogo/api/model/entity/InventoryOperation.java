package com.catalogo.api.model.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Entity
@Table(name = "operacoes_estoque")
public class InventoryOperation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "produto_id", nullable = false)
    private Product product;

    @Column(name = "tipo", nullable = false, length = 20)
    private String type;

    @Column(name = "quantidade", nullable = false)
    private Integer quantity;

    @Column(name = "quantidade_anterior")
    private Integer previousQuantity;

    @Column(name = "lead_nome", length = 120)
    private String leadName;

    @Column(name = "lead_telefone", length = 30)
    private String leadPhone;

    @Column(name = "sale_id")
    private UUID saleId;

    @CreationTimestamp
    @Column(name = "criado_em", updatable = false)
    private LocalDateTime createdAt;
}
