"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { EmailCodePayload, LoginPayload, PasswordResetPayload, RegisterPayload } from "@/types";
import { authService } from "@/services/auth-service";

export function useAuth() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const login = useCallback(
    async (payload: LoginPayload, options?: { redirectTo?: string | null }) => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const session = await authService.login(payload);
        authService.persistSession(session);
        const redirectTo = options?.redirectTo === undefined ? "/products" : options.redirectTo;
        if (redirectTo) {
          router.push(redirectTo);
        }
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to login.";
        setErrorMessage(message);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [router],
  );

  const register = useCallback(
    async (payload: RegisterPayload, options?: { redirectTo?: string | null }) => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const session = await authService.register(payload);
        authService.persistSession(session);
        const redirectTo = options?.redirectTo === undefined ? "/products" : options.redirectTo;
        if (redirectTo) {
          router.push(redirectTo);
        }
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to register.";
        setErrorMessage(message);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [router],
  );

  const requestRegisterCode = useCallback(async (payload: EmailCodePayload) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      await authService.requestRegisterCode(payload);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to send verification code.";
      setErrorMessage(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const requestPasswordReset = useCallback(async (payload: EmailCodePayload) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      await authService.requestPasswordReset(payload);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to request password reset.";
      setErrorMessage(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resetPassword = useCallback(async (payload: PasswordResetPayload) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      await authService.resetPassword(payload);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to reset password.";
      setErrorMessage(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Local cleanup still happens to avoid stale UI session state.
    } finally {
      authService.clearSession();
      router.replace("/login?logged_out=1");
    }
  }, [router]);

  const isAuthenticated = useMemo(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return authService.hasSession();
  }, []);

  return {
    errorMessage,
    isAuthenticated,
    isLoading,
    login,
    logout,
    requestPasswordReset,
    requestRegisterCode,
    resetPassword,
    register,
  };
}
