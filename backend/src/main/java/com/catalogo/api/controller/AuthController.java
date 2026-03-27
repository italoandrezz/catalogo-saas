package com.catalogo.api.controller;

import com.catalogo.api.model.dto.AuthResponse;
import com.catalogo.api.model.dto.ChangePasswordRequest;
import com.catalogo.api.model.dto.EmailCodeRequest;
import com.catalogo.api.model.dto.LoginRequest;
import com.catalogo.api.model.dto.RegisterRequest;
import com.catalogo.api.model.dto.ResetPasswordRequest;
import com.catalogo.api.model.dto.UpdateProfileRequest;
import com.catalogo.api.model.dto.UserProfileResponse;
import com.catalogo.api.security.AuthCookieService;
import com.catalogo.api.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final AuthCookieService authCookieService;

    @Value("${app.security.trust-proxy-headers:false}")
    private boolean trustProxyHeaders;

    @PostMapping("/register/request-code")
    public ResponseEntity<Void> requestRegisterCode(
            @Valid @RequestBody EmailCodeRequest request,
            HttpServletRequest httpRequest
    ) {
        String clientKey = buildClientKey(request.email(), httpRequest);
        authService.requestRegisterCode(request.email(), clientKey);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request, HttpServletResponse response) {
        AuthResponse authResponse = authService.register(request);
        authCookieService.addAuthCookie(response, authResponse.token());
        return ResponseEntity.ok(authResponse);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse response
    ) {
        String clientKey = buildClientKey(request.email(), httpRequest);
        AuthResponse authResponse = authService.login(request, clientKey);
        authCookieService.addAuthCookie(response, authResponse.token());
        return ResponseEntity.ok(authResponse);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletResponse response) {
        authCookieService.clearAuthCookie(response);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/profile")
    public ResponseEntity<UserProfileResponse> getProfile() {
        return ResponseEntity.ok(authService.getProfile());
    }

    @PutMapping("/profile")
    public ResponseEntity<UserProfileResponse> updateProfile(@Valid @RequestBody UpdateProfileRequest request) {
        return ResponseEntity.ok(authService.updateProfile(request));
    }

    @PostMapping("/password/change")
    public ResponseEntity<Void> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(request);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/password/forgot")
    public ResponseEntity<Void> requestPasswordReset(
            @Valid @RequestBody EmailCodeRequest request,
            HttpServletRequest httpRequest
    ) {
        String clientKey = buildClientKey(request.email(), httpRequest);
        authService.requestPasswordReset(request.email(), clientKey);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/password/reset")
    public ResponseEntity<Void> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request,
            HttpServletRequest httpRequest
    ) {
        String clientKey = buildClientKey(request.email(), httpRequest);
        authService.resetPassword(request, clientKey);
        return ResponseEntity.noContent().build();
    }

    private String buildClientKey(String email, HttpServletRequest request) {
        return extractClientIp(request) + "|" + email.trim().toLowerCase();
    }

    private String extractClientIp(HttpServletRequest request) {
        if (trustProxyHeaders) {
            String forwardedFor = request.getHeader("X-Forwarded-For");
            if (forwardedFor != null && !forwardedFor.isBlank()) {
                int commaIndex = forwardedFor.indexOf(',');
                return commaIndex > 0 ? forwardedFor.substring(0, commaIndex).trim() : forwardedFor.trim();
            }

            String realIp = request.getHeader("X-Real-IP");
            if (realIp != null && !realIp.isBlank()) {
                return realIp.trim();
            }
        }

        return request.getRemoteAddr();
    }
}
