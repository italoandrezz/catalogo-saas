import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/services/auth-service", () => ({
  authService: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    requestRegisterCode: vi.fn(),
    requestPasswordReset: vi.fn(),
    resetPassword: vi.fn(),
    persistSession: vi.fn(),
    clearSession: vi.fn(),
    hasSession: vi.fn(),
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

describe("useAuth", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { authService } = await import("@/services/auth-service");
    vi.mocked(authService.hasSession).mockReturnValue(false);
  });

  it("should login successfully and persist session", async () => {
    const { authService } = await import("@/services/auth-service");
    const mockSession = { token: "abc123", expiresAt: "2027-01-01" };
    vi.mocked(authService.login).mockResolvedValue(mockSession as never);

    const { useAuth } = await import("./use-auth");
    const { result } = renderHook(() => useAuth());

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.login(
        { email: "test@example.com", password: "pass123" },
        { redirectTo: null },
      );
    });

    expect(success).toBe(true);
    expect(authService.login).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "pass123",
    });
    expect(authService.persistSession).toHaveBeenCalledWith(mockSession);
    expect(result.current.errorMessage).toBeNull();
  });

  it("should set errorMessage on login failure", async () => {
    const { authService } = await import("@/services/auth-service");
    vi.mocked(authService.login).mockRejectedValue(new Error("Invalid credentials"));

    const { useAuth } = await import("./use-auth");
    const { result } = renderHook(() => useAuth());

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.login(
        { email: "bad@example.com", password: "wrong" },
        { redirectTo: null },
      );
    });

    expect(success).toBe(false);
    expect(result.current.errorMessage).toBe("Invalid credentials");
  });

  it("should register successfully and persist session", async () => {
    const { authService } = await import("@/services/auth-service");
    const mockSession = { token: "reg123", expiresAt: "2027-01-01" };
    vi.mocked(authService.register).mockResolvedValue(mockSession as never);

    const { useAuth } = await import("./use-auth");
    const { result } = renderHook(() => useAuth());

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.register(
        {
          companyName: "Acme",
          userName: "John",
          email: "john@example.com",
          password: "MyPass123!",
          verificationCode: "123456",
        },
        { redirectTo: null },
      );
    });

    expect(success).toBe(true);
    expect(authService.persistSession).toHaveBeenCalledWith(mockSession);
  });

  it("should set errorMessage on register failure", async () => {
    const { authService } = await import("@/services/auth-service");
    vi.mocked(authService.register).mockRejectedValue(
      new Error("Email already registered"),
    );

    const { useAuth } = await import("./use-auth");
    const { result } = renderHook(() => useAuth());

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.register(
        {
          companyName: "Acme",
          userName: "John",
          email: "existing@example.com",
          password: "MyPass123!",
          verificationCode: "123456",
        },
        { redirectTo: null },
      );
    });

    expect(success).toBe(false);
    expect(result.current.errorMessage).toBe("Email already registered");
  });

  it("should request register code successfully", async () => {
    const { authService } = await import("@/services/auth-service");
    vi.mocked(authService.requestRegisterCode).mockResolvedValue(undefined);

    const { useAuth } = await import("./use-auth");
    const { result } = renderHook(() => useAuth());

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.requestRegisterCode({
        email: "user@example.com",
      });
    });

    expect(success).toBe(true);
    expect(authService.requestRegisterCode).toHaveBeenCalledWith({
      email: "user@example.com",
    });
  });

  it("should request password reset successfully", async () => {
    const { authService } = await import("@/services/auth-service");
    vi.mocked(authService.requestPasswordReset).mockResolvedValue(undefined);

    const { useAuth } = await import("./use-auth");
    const { result } = renderHook(() => useAuth());

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.requestPasswordReset({
        email: "user@example.com",
      });
    });

    expect(success).toBe(true);
    expect(authService.requestPasswordReset).toHaveBeenCalled();
  });

  it("should reset password successfully", async () => {
    const { authService } = await import("@/services/auth-service");
    vi.mocked(authService.resetPassword).mockResolvedValue(undefined);

    const { useAuth } = await import("./use-auth");
    const { result } = renderHook(() => useAuth());

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.resetPassword({
        email: "user@example.com",
        verificationCode: "654321",
        newPassword: "NewPass456!",
      });
    });

    expect(success).toBe(true);
    expect(authService.resetPassword).toHaveBeenCalled();
  });

  it("should logout and clear session", async () => {
    const { authService } = await import("@/services/auth-service");
    vi.mocked(authService.logout).mockResolvedValue(undefined);

    const { useAuth } = await import("./use-auth");
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.logout();
    });

    expect(authService.clearSession).toHaveBeenCalled();
  });

  it("should clear session even when logout API fails", async () => {
    const { authService } = await import("@/services/auth-service");
    vi.mocked(authService.logout).mockRejectedValue(
      new Error("Network error"),
    );

    const { useAuth } = await import("./use-auth");
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.logout();
    });

    expect(authService.clearSession).toHaveBeenCalled();
  });

  it("should set isLoading true during async operations", async () => {
    const { authService } = await import("@/services/auth-service");
    let resolveLogin!: () => void;
    vi.mocked(authService.login).mockReturnValue(
      new Promise((resolve) => {
        resolveLogin = () => resolve({ token: "t", expiresAt: "2027-01-01" } as never);
      }),
    );

    const { useAuth } = await import("./use-auth");
    const { result } = renderHook(() => useAuth());

    act(() => {
      void result.current.login(
        { email: "a@b.com", password: "pass" },
        { redirectTo: null },
      );
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveLogin();
    });

    expect(result.current.isLoading).toBe(false);
  });

  it("should return isAuthenticated based on hasSession", async () => {
    const { authService } = await import("@/services/auth-service");
    vi.mocked(authService.hasSession).mockReturnValue(true);

    const { useAuth } = await import("./use-auth");
    const { result } = renderHook(() => useAuth());

    expect(result.current.isAuthenticated).toBe(true);
  });
});
