"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";

const REMEMBER_EMAIL_KEY = "catalog_remembered_email";
const ONBOARDING_DONE_KEY = "catalog_onboarding_done";

export default function LoginPage() {
  const { login, isLoading, errorMessage } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const emailValue = email.trim();
  const emailFormatIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue);
  const emailError = emailTouched
    ? (emailValue.length === 0 ? "Informe seu e-mail." : !emailFormatIsValid ? "Informe um e-mail valido." : null)
    : null;

  const passwordError = passwordTouched
    ? (password.length === 0 ? "Informe sua senha." : password.length < 8 ? "A senha deve ter ao menos 8 caracteres." : null)
    : null;

  const hasFieldErrors = Boolean(emailError || passwordError);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const rememberedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY);
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberEmail(true);
    }
  }, []);

  const handleEnterSubmit = (event: React.KeyboardEvent<HTMLElement>) => {
    if ((event.key !== "Enter" && event.code !== "NumpadEnter") || event.shiftKey || event.nativeEvent.isComposing) return;
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.tagName !== "INPUT") return;
    event.preventDefault();
    if (isLoading) return;
    handleSubmit();
  };

  const handleSubmit = async () => {
    setEmailTouched(true);
    setPasswordTouched(true);
    if (!emailValue || !emailFormatIsValid || password.length < 8) return;

    let destination = redirectTo;
    if (!destination && typeof window !== "undefined") {
      const onboardingDone = localStorage.getItem(ONBOARDING_DONE_KEY) === "1";
      destination = onboardingDone ? "/products" : "/onboarding";
    }

    const success = await login({ email: email.trim().toLowerCase(), password }, { redirectTo: destination });
    if (!success || typeof window === "undefined") return;

    if (rememberEmail) {
      localStorage.setItem(REMEMBER_EMAIL_KEY, email.trim().toLowerCase());
      return;
    }

    localStorage.removeItem(REMEMBER_EMAIL_KEY);
  };

  const redirectTo = (() => {
    const value = typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("redirect")
      : null;
    if (!value) return null;
    // Only allow in-app absolute paths and block protocol-relative or nested scheme attempts.
    if (value.startsWith("/") && !value.startsWith("//") && !value.includes("://")) {
      return value;
    }
    return null;
  })();

  const guidedHelp = (() => {
    if (!errorMessage) return null;
    const normalizedMessage = errorMessage.toLowerCase();

    if (normalizedMessage.includes("e-mail") && normalizedMessage.includes("nao encontrado")) {
      return {
        title: "E-mail não encontrado",
        hint: "Verifique a digitação ou crie sua conta em poucos passos.",
        href: "/register",
        cta: "Criar conta",
      };
    }

    if (normalizedMessage.includes("senha incorreta")) {
      return {
        title: "Senha incorreta",
        hint: "Confira se o Caps Lock está ativo ou redefina sua senha.",
        href: "/forgot-password",
        cta: "Redefinir senha",
      };
    }

    if (normalizedMessage.includes("too many") || normalizedMessage.includes("muitas tentativas")) {
      return {
        title: "Muitas tentativas",
        hint: "Aguarde alguns minutos e tente novamente.",
        href: "/forgot-password",
        cta: "Recuperar acesso",
      };
    }

    return {
      title: "Não foi possível entrar",
      hint: "Revise seus dados e tente novamente.",
      href: "/forgot-password",
      cta: "Preciso de ajuda",
    };
  })();

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Boas-vindas de volta</h1>
        <p className="mt-1 text-sm text-slate-600">Entre para gerenciar seu catálogo.</p>

        <form
          className="mt-6 space-y-4"
          onKeyDownCapture={handleEnterSubmit}
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit();
          }}
          noValidate
        >
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (!emailTouched) setEmailTouched(true);
              }}
              onBlur={() => setEmailTouched(true)}
              className={"w-full rounded-lg border px-3 py-2 outline-none ring-slate-400 transition focus:ring " + (emailError ? "border-red-400" : "border-slate-300")}
              required
              maxLength={150}
              autoComplete="email"
              enterKeyHint="go"
              aria-invalid={Boolean(emailError)}
            />
            {emailError && <p className="mt-1 text-xs text-red-600">{emailError}</p>}
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
              Senha
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (!passwordTouched) setPasswordTouched(true);
                }}
                onBlur={() => setPasswordTouched(true)}
                className={"w-full rounded-lg border px-3 py-2 pr-12 outline-none ring-slate-400 transition focus:ring " + (passwordError ? "border-red-400" : "border-slate-300")}
                required
                minLength={8}
                maxLength={72}
                autoComplete="current-password"
                enterKeyHint="go"
                aria-invalid={Boolean(passwordError)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute inset-y-1.5 right-1.5 flex w-9 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                aria-pressed={showPassword}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                    <path d="M3 3l18 18" />
                    <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                    <path d="M9.9 4.2A10.9 10.9 0 0 1 12 4c5.5 0 9.6 4.2 10 8-.2 2-1.5 4.2-3.5 5.9" />
                    <path d="M6.2 6.2C4 7.7 2.5 9.8 2 12c.8 3.7 4.8 8 10 8 1.7 0 3.3-.4 4.6-1" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                    <path d="M2 12c.8-3.8 4.7-8 10-8s9.2 4.2 10 8c-.8 3.8-4.7 8-10 8s-9.2-4.2-10-8Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {passwordError && <p className="mt-1 text-xs text-red-600">{passwordError}</p>}
            <div className="mt-2 flex items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberEmail}
                  onChange={(event) => setRememberEmail(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Lembrar e-mail
              </label>
              <Link href="/forgot-password" className="text-xs font-semibold text-slate-700 hover:underline">
                Esqueceu sua senha?
              </Link>
            </div>
          </div>

          {errorMessage && (
            <div role="alert" aria-live="polite" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
              <p className="text-sm font-semibold text-red-700">{guidedHelp?.title ?? "Falha no login"}</p>
              <p className="mt-1 text-xs text-red-600">{guidedHelp?.hint ?? errorMessage}</p>
              {guidedHelp?.href && (
                <Link href={guidedHelp.href} className="mt-2 inline-block text-xs font-semibold text-red-700 underline">
                  {guidedHelp.cta}
                </Link>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || hasFieldErrors}
            className="w-full rounded-lg bg-slate-900 px-4 py-2 font-medium text-white transition hover:bg-slate-700 disabled:opacity-60"
          >
            {isLoading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-600">
          Ainda não tem conta?{" "}
          <Link href="/register" className="font-semibold text-slate-900 hover:underline">
            Criar conta
          </Link>
        </p>
      </div>
    </main>
  );
}
