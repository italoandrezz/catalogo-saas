package com.catalogo.api.service;

import com.catalogo.api.exception.ConflictException;
import com.catalogo.api.model.dto.AuthResponse;
import com.catalogo.api.model.dto.LoginRequest;
import com.catalogo.api.model.dto.RegisterRequest;
import com.catalogo.api.model.entity.Tenant;
import com.catalogo.api.model.entity.User;
import com.catalogo.api.repository.TenantRepository;
import com.catalogo.api.repository.UserRepository;
import com.catalogo.api.security.JwtService;
import com.catalogo.api.security.LoginAttemptService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private TenantRepository tenantRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @Mock
    private LoginAttemptService loginAttemptService;

    @Mock
    private EmailCodeService emailCodeService;

    @InjectMocks
    private AuthService authService;

    @Test
    void registerShouldThrowConflictWhenEmailAlreadyExists() {
        RegisterRequest request = new RegisterRequest("Company", "owner@acme.com", "secret", "Owner", "123456");
        when(userRepository.existsByEmail(request.email())).thenReturn(true);

        assertThrows(ConflictException.class, () -> authService.register(request));
    }

    @Test
    void registerShouldCreateTenantAndAdminUser() {
        RegisterRequest request = new RegisterRequest("Acme", "owner@acme.com", "secret", "Owner", "123456");
        Tenant tenant = new Tenant();
        tenant.setId(UUID.randomUUID());
        tenant.setName(request.companyName());
        tenant.setEmail(request.email());

        when(userRepository.existsByEmail(request.email())).thenReturn(false);
        when(tenantRepository.save(any(Tenant.class))).thenReturn(tenant);
        when(passwordEncoder.encode(request.password())).thenReturn("encoded-secret");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(jwtService.generateToken(any(User.class))).thenReturn("jwt-token");

        AuthResponse response = authService.register(request);

        assertNotNull(response);
        assertEquals("jwt-token", response.token());
        assertEquals("Owner", response.name());
        assertEquals("owner@acme.com", response.email());
        assertEquals("ADMIN", response.role());
        assertEquals(tenant.getId(), response.tenantId());

        verify(tenantRepository).save(any(Tenant.class));
        verify(userRepository).save(any(User.class));
    }

    @Test
    void loginShouldAuthenticateAndReturnToken() {
        UUID tenantId = UUID.randomUUID();
        Tenant tenant = new Tenant();
        tenant.setId(tenantId);

        User user = new User();
        user.setTenant(tenant);
        user.setName("Owner");
        user.setEmail("owner@acme.com");
        user.setRole("ADMIN");

        String clientKey = "127.0.0.1|owner@acme.com";
        LoginRequest request = new LoginRequest("owner@acme.com", "secret");

        when(userRepository.findByEmail(request.email())).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("secret", user.getPassword())).thenReturn(true);
        when(jwtService.generateToken(user)).thenReturn("jwt-token");

        AuthResponse response = authService.login(request, clientKey);

        verify(loginAttemptService).ensureCanAttempt(clientKey, "login");
        verify(loginAttemptService).registerSuccess(clientKey);
        assertEquals("jwt-token", response.token());
        assertEquals("Owner", response.name());
        assertEquals("owner@acme.com", response.email());
        assertEquals(tenantId, response.tenantId());
    }

    @Test
    void loginShouldThrowNotFoundWhenEmailDoesNotExist() {
        String clientKey = "127.0.0.1|missing@acme.com";
        LoginRequest request = new LoginRequest("missing@acme.com", "secret");

        when(userRepository.findByEmail(request.email())).thenReturn(Optional.empty());

        var exception = assertThrows(com.catalogo.api.exception.ResourceNotFoundException.class, () -> authService.login(request, clientKey));

        assertEquals("E-mail nao encontrado.", exception.getMessage());
        verify(loginAttemptService).ensureCanAttempt(clientKey, "login");
        verify(loginAttemptService, never()).registerSuccess(clientKey);
    }

    @Test
    void loginShouldThrowBadCredentialsWhenPasswordIsInvalid() {
        UUID tenantId = UUID.randomUUID();
        Tenant tenant = new Tenant();
        tenant.setId(tenantId);

        User user = new User();
        user.setTenant(tenant);
        user.setName("Owner");
        user.setEmail("owner@acme.com");
        user.setPassword("encoded-secret");
        user.setRole("ADMIN");

        String clientKey = "127.0.0.1|owner@acme.com";
        LoginRequest request = new LoginRequest("owner@acme.com", "wrong-secret");

        when(userRepository.findByEmail(request.email())).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong-secret", "encoded-secret")).thenReturn(false);

        BadCredentialsException exception = assertThrows(BadCredentialsException.class, () -> authService.login(request, clientKey));

        assertEquals("Senha incorreta.", exception.getMessage());
        verify(loginAttemptService).ensureCanAttempt(clientKey, "login");
        verify(loginAttemptService).registerFailure(clientKey);
        verify(loginAttemptService, never()).registerSuccess(clientKey);
    }
}
