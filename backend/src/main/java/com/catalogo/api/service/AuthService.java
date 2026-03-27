package com.catalogo.api.service;

import com.catalogo.api.exception.ConflictException;
import com.catalogo.api.exception.ResourceNotFoundException;
import com.catalogo.api.model.dto.AuthResponse;
import com.catalogo.api.model.dto.ChangePasswordRequest;
import com.catalogo.api.model.dto.LoginRequest;
import com.catalogo.api.model.dto.RegisterRequest;
import com.catalogo.api.model.dto.ResetPasswordRequest;
import com.catalogo.api.model.dto.UpdateProfileRequest;
import com.catalogo.api.model.dto.UserProfileResponse;
import com.catalogo.api.model.entity.Tenant;
import com.catalogo.api.model.entity.User;
import com.catalogo.api.repository.TenantRepository;
import com.catalogo.api.repository.UserRepository;
import com.catalogo.api.security.JwtService;
import com.catalogo.api.security.LoginAttemptService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final String RATE_LIMIT_REGISTER_CODE_PREFIX = "register-code|";
    private static final String RATE_LIMIT_FORGOT_PASSWORD_PREFIX = "forgot-password|";
    private static final String RATE_LIMIT_RESET_PASSWORD_PREFIX = "reset-password|";

    private final UserRepository userRepository;
    private final TenantRepository tenantRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final LoginAttemptService loginAttemptService;
    private final EmailCodeService emailCodeService;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String normalizedEmail = normalizeEmail(request.email());
        validateEmailAvailability(normalizedEmail);
        emailCodeService.validateAndConsumeCode(
            normalizedEmail,
            EmailCodeService.PURPOSE_REGISTER,
            request.verificationCode()
        );

        Tenant tenant = createTenant(request, normalizedEmail);
        User user = createAdminUser(request, tenant, normalizedEmail);

        String token = jwtService.generateToken(user);
        return new AuthResponse(token, user.getName(), user.getEmail(), user.getRole(), tenant.getId());
    }

    public AuthResponse login(LoginRequest request, String clientKey) {
        String normalizedEmail = normalizeEmail(request.email());
        loginAttemptService.ensureCanAttempt(clientKey, "login");

        User user = userRepository.findByEmail(normalizedEmail)
            .orElseThrow(() -> new ResourceNotFoundException("E-mail nao encontrado."));

        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            loginAttemptService.registerFailure(clientKey);
            throw new BadCredentialsException("Senha incorreta.");
        }

        loginAttemptService.registerSuccess(clientKey);
        String token = jwtService.generateToken(user);
        return new AuthResponse(token, user.getName(), user.getEmail(), user.getRole(), user.getTenant().getId());
    }

    public void requestRegisterCode(String email, String clientKey) {
        String key = RATE_LIMIT_REGISTER_CODE_PREFIX + clientKey;
        loginAttemptService.ensureCanAttempt(key, "register-code");
        try {
            emailCodeService.sendRegisterCode(email);
            // Conta cada solicitacao para limitar spam mesmo quando a chamada tem sucesso.
            loginAttemptService.registerFailure(key);
        } catch (RuntimeException exception) {
            loginAttemptService.registerFailure(key);
            throw exception;
        }
    }

    public void requestPasswordReset(String email, String clientKey) {
        String key = RATE_LIMIT_FORGOT_PASSWORD_PREFIX + clientKey;
        loginAttemptService.ensureCanAttempt(key, "forgot-password");
        String normalizedEmail = normalizeEmail(email);
        if (!userRepository.existsByEmail(normalizedEmail)) {
            loginAttemptService.registerFailure(key);
            return;
        }
        try {
            emailCodeService.sendResetPasswordCode(normalizedEmail);
            loginAttemptService.registerFailure(key);
        } catch (RuntimeException exception) {
            loginAttemptService.registerFailure(key);
            throw exception;
        }
    }

    @Transactional(readOnly = true)
    public UserProfileResponse getProfile() {
        User user = getAuthenticatedUser();
        return new UserProfileResponse(
            user.getId(),
            user.getName(),
            user.getEmail(),
            user.getRole(),
            user.getTenant().getId()
        );
    }

    @Transactional
    public UserProfileResponse updateProfile(UpdateProfileRequest request) {
        User user = getAuthenticatedUser();
        String normalizedEmail = normalizeEmail(request.email());

        if (userRepository.existsByEmailAndIdNot(normalizedEmail, user.getId())) {
            throw new ConflictException("Email is already in use");
        }

        user.setName(request.name().trim());
        user.setEmail(normalizedEmail);
        userRepository.save(user);

        return new UserProfileResponse(
            user.getId(),
            user.getName(),
            user.getEmail(),
            user.getRole(),
            user.getTenant().getId()
        );
    }

    @Transactional
    public void changePassword(ChangePasswordRequest request) {
        User user = getAuthenticatedUser();

        if (!passwordEncoder.matches(request.currentPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Current password is invalid");
        }

        if (passwordEncoder.matches(request.newPassword(), user.getPassword())) {
            throw new IllegalArgumentException("New password must be different from the current password");
        }

        user.setPassword(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request, String clientKey) {
        String key = RATE_LIMIT_RESET_PASSWORD_PREFIX + clientKey;
        loginAttemptService.ensureCanAttempt(key, "reset-password");
        String normalizedEmail = normalizeEmail(request.email());
        try {
            User user = userRepository.findByEmail(normalizedEmail)
                    .orElseThrow(() -> new ResourceNotFoundException("User not found"));

            emailCodeService.validateAndConsumeCode(
                    normalizedEmail,
                    EmailCodeService.PURPOSE_RESET_PASSWORD,
                    request.verificationCode()
            );

            user.setPassword(passwordEncoder.encode(request.newPassword()));
            userRepository.save(user);
            loginAttemptService.registerSuccess(key);
        } catch (RuntimeException exception) {
            loginAttemptService.registerFailure(key);
            throw exception;
        }
    }

    private void validateEmailAvailability(String email) {
        if (userRepository.existsByEmail(email)) {
            throw new ConflictException("Email is already in use");
        }
    }

    private Tenant createTenant(RegisterRequest request, String normalizedEmail) {
        Tenant tenant = new Tenant();
        tenant.setName(request.companyName().trim());
        tenant.setEmail(normalizedEmail);
        return tenantRepository.save(tenant);
    }

    private User createAdminUser(RegisterRequest request, Tenant tenant, String normalizedEmail) {
        User user = new User();
        user.setTenant(tenant);
        user.setName(request.userName().trim());
        user.setEmail(normalizedEmail);
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setRole("ADMIN");
        return userRepository.save(user);
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private User getAuthenticatedUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null || authentication.getName().isBlank()) {
            throw new ResourceNotFoundException("Authenticated user not found");
        }

        return userRepository.findByEmail(normalizeEmail(authentication.getName()))
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
