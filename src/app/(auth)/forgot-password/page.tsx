"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { SuccessModal } from "@/components/ui/success-modal";

const PASSWORD_RULES = {
  minLength: 12,
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  number: /\d/,
  special: /[^A-Za-z\d]/,
};

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { requestPasswordReset, resetPassword, isLoading, errorMessage } = useAuth();
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  const passwordChecks = useMemo(
    () => ({
      minLength: newPassword.length >= PASSWORD_RULES.minLength,
      uppercase: PASSWORD_RULES.uppercase.test(newPassword),
      lowercase: PASSWORD_RULES.lowercase.test(newPassword),
      number: PASSWORD_RULES.number.test(newPassword),
      special: PASSWORD_RULES.special.test(newPassword),
    }),
    [newPassword],
  );

  const isPasswordStrong = Object.values(passwordChecks).every(Boolean);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Redefinir senha</h1>
        <p className="mt-1 text-sm text-slate-600">Solicite um código de verificação e defina uma nova senha.</p>

        <form
          className="mt-6 space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setLocalError(null);
            setInfoMessage(null);

            if (!/^\d{6}$/.test(verificationCode)) {
              setLocalError("Informe o código de verificação de 6 dígitos.");
              return;
            }

            if (!isPasswordStrong) {
              setLocalError("Use uma senha mais forte para continuar.");
              return;
            }

            if (newPassword !== confirmPassword) {
              setLocalError("As senhas não coincidem.");
              return;
            }

            const success = await resetPassword({
              email: email.trim().toLowerCase(),
              verificationCode,
              newPassword,
            });

            if (success) {
              setIsSuccessModalOpen(true);
            }
          }}
        >
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-sky-300 transition focus:ring"
              required
              maxLength={150}
              autoComplete="email"
            />
            <button
              type="button"
              onClick={async () => {
                setLocalError(null);
                setInfoMessage(null);

                const normalizedEmail = email.trim().toLowerCase();
                if (!normalizedEmail) {
                  setLocalError("Informe o e-mail antes de solicitar o código.");
                  return;
                }

                const success = await requestPasswordReset({ email: normalizedEmail });
                if (success) {
                  setInfoMessage("Se o e-mail existir, um código de verificação foi enviado.");
                }
              }}
              disabled={isLoading}
              className="mt-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
            >
              Enviar código
            </button>
          </div>

          <div>
            <label htmlFor="verificationCode" className="mb-1 block text-sm font-medium text-slate-700">
              Código de verificação
            </label>
            <input
              id="verificationCode"
              value={verificationCode}
              onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-sky-300 transition focus:ring"
              required
              minLength={6}
              maxLength={6}
              inputMode="numeric"
              autoComplete="one-time-code"
            />
          </div>

          <div>
            <label htmlFor="newPassword" className="mb-1 block text-sm font-medium text-slate-700">
              Nova senha
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-sky-300 transition focus:ring"
              required
              minLength={12}
              maxLength={72}
              autoComplete="new-password"
            />
            <ul className="mt-2 space-y-1 text-xs text-slate-600">
              <li className={passwordChecks.minLength ? "text-emerald-600" : ""}>Mínimo 12 caracteres</li>
              <li className={passwordChecks.uppercase ? "text-emerald-600" : ""}>Ao menos uma letra maiúscula</li>
              <li className={passwordChecks.lowercase ? "text-emerald-600" : ""}>Ao menos uma letra minúscula</li>
              <li className={passwordChecks.number ? "text-emerald-600" : ""}>Ao menos um número</li>
              <li className={passwordChecks.special ? "text-emerald-600" : ""}>Ao menos um caractere especial</li>
            </ul>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-slate-700">
              Confirmar nova senha
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none ring-sky-300 transition focus:ring"
              required
              minLength={12}
              maxLength={72}
              autoComplete="new-password"
            />
          </div>

          {infoMessage && <p aria-live="polite" className="text-sm text-emerald-700">{infoMessage}</p>}
          {(localError || errorMessage) && <p role="alert" aria-live="polite" className="text-sm text-red-600">{localError ?? errorMessage}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-slate-900 px-4 py-2 font-medium text-white transition hover:bg-slate-700 disabled:opacity-60"
          >
            {isLoading ? "Atualizando senha..." : "Atualizar senha"}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-600">
          Voltar para{" "}
          <Link href="/login" className="font-semibold text-slate-900 hover:underline">
            Entrar
          </Link>
        </p>
      </div>

      <SuccessModal
        isOpen={isSuccessModalOpen}
        title="Senha atualizada com sucesso"
        message="Sua senha foi alterada. Use a nova senha para entrar."
        confirmLabel="Ir para o login"
        onConfirm={() => {
          setIsSuccessModalOpen(false);
          router.push("/login");
        }}
      />
    </main>
  );
}
