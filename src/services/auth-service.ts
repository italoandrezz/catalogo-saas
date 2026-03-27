import { api } from "@/lib/api";
import type {
  AuthResponse,
  ChangePasswordPayload,
  EmailCodePayload,
  LoginPayload,
  PasswordResetPayload,
  RegisterPayload,
  SessionUser,
  UpdateProfilePayload,
  UserProfile,
} from "@/types";

const USER_KEY = "user_session";
const SESSION_EVENT = "auth-session-changed";

export const authService = {
  async login(payload: LoginPayload): Promise<AuthResponse> {
    return api.post<AuthResponse, LoginPayload>("/api/auth/login", payload);
  },

  async register(payload: RegisterPayload): Promise<AuthResponse> {
    return api.post<AuthResponse, RegisterPayload>("/api/auth/register", payload);
  },

  async requestRegisterCode(payload: EmailCodePayload): Promise<void> {
    await api.post<void, EmailCodePayload>("/api/auth/register/request-code", payload);
  },

  async requestPasswordReset(payload: EmailCodePayload): Promise<void> {
    await api.post<void, EmailCodePayload>("/api/auth/password/forgot", payload);
  },

  async resetPassword(payload: PasswordResetPayload): Promise<void> {
    await api.post<void, PasswordResetPayload>("/api/auth/password/reset", payload);
  },

  async logout(): Promise<void> {
    await api.post<void, undefined>("/api/auth/logout");
  },

  async getProfile(): Promise<UserProfile> {
    return api.get<UserProfile>("/api/auth/profile");
  },

  async updateProfile(payload: UpdateProfilePayload): Promise<UserProfile> {
    return api.put<UserProfile, UpdateProfilePayload>("/api/auth/profile", payload);
  },

  async changePassword(payload: ChangePasswordPayload): Promise<void> {
    await api.post<void, ChangePasswordPayload>("/api/auth/password/change", payload);
  },

  persistSession(session: AuthResponse): void {
    if (typeof window === "undefined") {
      return;
    }

    const userSession: SessionUser = {
      sessionActive: true,
      tenantId: session.tenantId,
      name: session.name,
      email: session.email,
      role: session.role,
    };

    localStorage.setItem(USER_KEY, JSON.stringify(userSession));
    window.dispatchEvent(new Event(SESSION_EVENT));
  },

  updateStoredProfile(profile: UserProfile): void {
    if (typeof window === "undefined") {
      return;
    }

    const current = authService.getSession();
    if (!current) {
      return;
    }

    const updatedSession: SessionUser = {
      ...current,
      name: profile.name,
      email: profile.email,
      role: profile.role,
      tenantId: profile.tenantId,
    };

    localStorage.setItem(USER_KEY, JSON.stringify(updatedSession));
    window.dispatchEvent(new Event(SESSION_EVENT));
  },

  clearSession(): void {
    if (typeof window === "undefined") {
      return;
    }

    localStorage.removeItem(USER_KEY);
    window.dispatchEvent(new Event(SESSION_EVENT));
  },

  hasSession(): boolean {
    if (typeof window === "undefined") {
      return false;
    }

    return Boolean(localStorage.getItem(USER_KEY));
  },

  getSession(): SessionUser | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SessionUser;
    } catch {
      return null;
    }
  },

  subscribeToSessionChanges(callback: () => void): () => void {
    if (typeof window === "undefined") {
      return () => undefined;
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === USER_KEY) {
        callback();
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(SESSION_EVENT, callback);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(SESSION_EVENT, callback);
    };
  },
};
