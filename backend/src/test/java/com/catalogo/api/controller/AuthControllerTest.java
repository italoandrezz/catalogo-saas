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
import com.catalogo.api.security.JwtAuthFilter;
import com.catalogo.api.service.AuthService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AuthService authService;

    @MockBean
    private JwtAuthFilter jwtAuthFilter;

    @MockBean
    private AuthCookieService authCookieService;

    @Test
    void registerShouldReturn200AndBody() throws Exception {
        AuthResponse response = new AuthResponse("token", "Owner", "owner@acme.com", "ADMIN", UUID.randomUUID());
        when(authService.register(any(RegisterRequest.class))).thenReturn(response);

        RegisterRequest request = new RegisterRequest("Acme", "owner@acme.com", "StrongPass#2026", "Owner", "123456");

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("token"))
                .andExpect(jsonPath("$.email").value("owner@acme.com"));
    }

    @Test
    void loginShouldReturn200AndBody() throws Exception {
        AuthResponse response = new AuthResponse("token", "Owner", "owner@acme.com", "ADMIN", UUID.randomUUID());
        when(authService.login(any(LoginRequest.class), any(String.class))).thenReturn(response);

        LoginRequest request = new LoginRequest("owner@acme.com", "StrongPass#2026");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("token"))
                .andExpect(jsonPath("$.name").value("Owner"));
    }

    @Test
    void requestRegisterCodeShouldReturn204() throws Exception {
        EmailCodeRequest request = new EmailCodeRequest("owner@acme.com");

        mockMvc.perform(post("/api/auth/register/request-code")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNoContent());
    }

    @Test
    void requestPasswordResetShouldReturn204() throws Exception {
        EmailCodeRequest request = new EmailCodeRequest("owner@acme.com");

        mockMvc.perform(post("/api/auth/password/forgot")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNoContent());
    }

    @Test
    void resetPasswordShouldReturn204() throws Exception {
        ResetPasswordRequest request = new ResetPasswordRequest("owner@acme.com", "123456", "StrongPass#2026");

        mockMvc.perform(post("/api/auth/password/reset")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNoContent());
    }

    @Test
    void getProfileShouldReturn200AndBody() throws Exception {
        UserProfileResponse response = new UserProfileResponse(
            UUID.randomUUID(),
            "Owner",
            "owner@acme.com",
            "ADMIN",
            UUID.randomUUID()
        );
        when(authService.getProfile()).thenReturn(response);

        mockMvc.perform(get("/api/auth/profile").with(user("owner@acme.com")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Owner"))
            .andExpect(jsonPath("$.email").value("owner@acme.com"));
    }

    @Test
    void updateProfileShouldReturn200AndBody() throws Exception {
        UpdateProfileRequest request = new UpdateProfileRequest("Novo Nome", "novo@acme.com");
        UserProfileResponse response = new UserProfileResponse(
            UUID.randomUUID(),
            "Novo Nome",
            "novo@acme.com",
            "ADMIN",
            UUID.randomUUID()
        );
        when(authService.updateProfile(any(UpdateProfileRequest.class))).thenReturn(response);

        mockMvc.perform(put("/api/auth/profile")
                        .with(user("owner@acme.com"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Novo Nome"))
                .andExpect(jsonPath("$.email").value("novo@acme.com"));
    }

    @Test
    void changePasswordShouldReturn204() throws Exception {
        ChangePasswordRequest request = new ChangePasswordRequest("StrongPass#2026", "EvenStronger#2026");

        mockMvc.perform(post("/api/auth/password/change")
                        .with(user("owner@acme.com"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNoContent());
    }
}
