package com.catalogo.api.repository;

import com.catalogo.api.model.entity.AuthVerificationCode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface AuthVerificationCodeRepository extends JpaRepository<AuthVerificationCode, UUID> {

    Optional<AuthVerificationCode> findTopByEmailAndPurposeAndUsedAtIsNullOrderByCreatedAtDesc(String email, String purpose);
}
