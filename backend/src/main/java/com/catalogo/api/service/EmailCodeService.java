package com.catalogo.api.service;

import com.catalogo.api.exception.ResourceNotFoundException;
import com.catalogo.api.model.entity.AuthVerificationCode;
import com.catalogo.api.repository.AuthVerificationCodeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Locale;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailCodeService {

    public static final String PURPOSE_REGISTER = "REGISTER";
    public static final String PURPOSE_RESET_PASSWORD = "RESET_PASSWORD";

    private final AuthVerificationCodeRepository authVerificationCodeRepository;
    private final PasswordEncoder passwordEncoder;
    private final JavaMailSender mailSender;

    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${auth.code.expiration-minutes:10}")
    private long codeExpirationMinutes;

    @Value("${app.email.enabled:false}")
    private boolean emailEnabled;

    @Value("${app.email.from:no-reply@catalogo.local}")
    private String emailFrom;

    public void sendRegisterCode(String email) {
        String normalizedEmail = normalizeEmail(email);
        String code = createAndStoreCode(normalizedEmail, PURPOSE_REGISTER);
        sendEmail(normalizedEmail, "Catalog verification code", buildRegisterMessage(code));
    }

    public void sendResetPasswordCode(String email) {
        String normalizedEmail = normalizeEmail(email);
        String code = createAndStoreCode(normalizedEmail, PURPOSE_RESET_PASSWORD);
        sendEmail(normalizedEmail, "Catalog password reset code", buildResetMessage(code));
    }

    public void validateAndConsumeCode(String email, String purpose, String providedCode) {
        String normalizedEmail = normalizeEmail(email);

        AuthVerificationCode savedCode = authVerificationCodeRepository
                .findTopByEmailAndPurposeAndUsedAtIsNullOrderByCreatedAtDesc(normalizedEmail, purpose)
                .orElseThrow(() -> new ResourceNotFoundException("Verification code not found"));

        if (savedCode.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Verification code has expired");
        }

        if (!passwordEncoder.matches(providedCode, savedCode.getCodeHash())) {
            throw new IllegalArgumentException("Invalid verification code");
        }

        savedCode.setUsedAt(LocalDateTime.now());
        authVerificationCodeRepository.save(savedCode);
    }

    private String createAndStoreCode(String email, String purpose) {
        String code = generateNumericCode();

        AuthVerificationCode verificationCode = new AuthVerificationCode();
        verificationCode.setEmail(email);
        verificationCode.setPurpose(purpose);
        verificationCode.setCodeHash(passwordEncoder.encode(code));
        verificationCode.setExpiresAt(LocalDateTime.now().plusMinutes(codeExpirationMinutes));

        authVerificationCodeRepository.save(verificationCode);
        return code;
    }

    private String generateNumericCode() {
        int number = secureRandom.nextInt(900000) + 100000;
        return String.valueOf(number);
    }

    private void sendEmail(String to, String subject, String body) {
        if (!emailEnabled) {
            log.info("Email disabled. Target: {}, Subject: {}, Body: {}", to, subject, body);
            return;
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(emailFrom);
        message.setTo(to);
        message.setSubject(subject);
        message.setText(body);
        mailSender.send(message);
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String buildRegisterMessage(String code) {
        return "Your verification code is: " + code + "\n\nThis code expires in " + codeExpirationMinutes + " minutes.";
    }

    private String buildResetMessage(String code) {
        return "Use this code to reset your password: " + code + "\n\nThis code expires in " + codeExpirationMinutes + " minutes.";
    }
}
