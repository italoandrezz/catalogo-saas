package com.catalogo.api.model.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
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
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Entity
@Table(name = "produtos")
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    @JsonIgnore
    private Tenant tenant;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "categoria_id")
    @JsonIgnore
    private Category category;

    @Column(name = "nome", nullable = false, length = 200)
    private String name;

    @Column(name = "descricao", columnDefinition = "TEXT")
    private String description;

    @Column(name = "preco", precision = 10, scale = 2)
    private BigDecimal price;

    @Column(name = "estoque")
    private Integer stock = 0;

    @Column(name = "imagem_url", length = 500)
    private String imageUrl;

    @Column(name = "imagens_galeria", columnDefinition = "TEXT")
    private String imageGallery;

    @Column(name = "variacoes", columnDefinition = "TEXT")
    private String variations;

    @Column(name = "badge_novo")
    private Boolean badgeNew = false;

    @Column(name = "badge_promocao")
    private Boolean badgePromo = false;

    @Column(name = "badge_mais_vendido")
    private Boolean badgeBestSeller = false;

    @Column(name = "desconto_percentual")
    private Integer discountPercent = 0;

    @Column(name = "ativo")
    private Boolean active = true;

    @CreationTimestamp
    @Column(name = "criado_em", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "atualizado_em")
    private LocalDateTime updatedAt;

    @JsonProperty("categoryId")
    public UUID getCategoryId() {
        return category != null ? category.getId() : null;
    }

    @JsonProperty("categoryName")
    public String getCategoryName() {
        return category != null ? category.getName() : null;
    }
}
