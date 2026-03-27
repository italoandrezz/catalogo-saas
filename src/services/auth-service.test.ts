import { afterEach, describe, expect, it } from "vitest";
import { authService } from "@/services/auth-service";
import type { AuthResponse } from "@/types";

const SESSION: AuthResponse = {
  token: "token-123",
  name: "Owner",
  email: "owner@acme.com",
  role: "ADMIN",
  tenantId: "tenant-1",
};

describe("authService", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("should persist only non-sensitive user session", () => {
    authService.persistSession(SESSION);

    const savedSession = localStorage.getItem("user_session");
    expect(savedSession).toContain("sessionActive");
    expect(savedSession).toContain("tenant-1");
    expect(savedSession).toContain("owner@acme.com");
    expect(savedSession).toContain("Owner");
    expect(savedSession).toContain("ADMIN");
    expect(savedSession).not.toContain("token-123");
  });

  it("should clear session", () => {
    authService.persistSession(SESSION);
    authService.clearSession();

    expect(localStorage.getItem("user_session")).toBeNull();
  });

  it("should identify session presence", () => {
    expect(authService.hasSession()).toBe(false);
    authService.persistSession(SESSION);
    expect(authService.hasSession()).toBe(true);
  });
});
