"use client";

import { FormEvent, useEffect, useState } from "react";
import { authService } from "@/services/auth-service";
import type { UserProfile } from "@/types";

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await authService.getProfile();
        setProfile(response);
        setName(response.name);
        setEmail(response.email);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Não foi possível carregar o perfil.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadProfile();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const updatedProfile = await authService.updateProfile({ name, email });
      setProfile(updatedProfile);
      authService.updateStoredProfile(updatedProfile);
      setSuccessMessage("Perfil atualizado com sucesso.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível atualizar o perfil.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
        <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Perfil</h2>
        <p className="mt-1 text-sm text-slate-500">Atualize seus dados de acesso e identificação.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_0.9fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="profile-name" className="mb-2 block text-sm font-medium text-slate-700">
                Nome
              </label>
              <input
                id="profile-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                placeholder="Seu nome"
                required
              />
            </div>

            <div>
              <label htmlFor="profile-email" className="mb-2 block text-sm font-medium text-slate-700">
                E-mail
              </label>
              <input
                id="profile-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                placeholder="voce@empresa.com"
                required
              />
            </div>

            {errorMessage && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {successMessage}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isSaving ? "Salvando..." : "Salvar alterações"}
              </button>
            </div>
          </form>
        </section>

        <aside className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Resumo da conta</p>
            <h3 className="mt-2 text-lg font-semibold text-slate-900">Informações atuais</h3>
          </div>

          <InfoRow label="Perfil" value={profile?.role ?? "-"} />
          <InfoRow label="Tenant" value={profile?.tenantId ?? "-"} />
          <InfoRow label="E-mail atual" value={profile?.email ?? "-"} />
        </aside>
      </div>
    </div>
  );
}

type InfoRowProps = {
  label: string;
  value: string;
};

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 break-all text-sm text-slate-800">{value}</p>
    </div>
  );
}
