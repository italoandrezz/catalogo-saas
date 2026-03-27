"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const ONBOARDING_DONE_KEY = "catalog_onboarding_done";

type SetupStep = {
  id: "categories" | "products" | "customers";
  title: string;
  description: string;
  href: string;
};

const SETUP_STEPS: SetupStep[] = [
  {
    id: "categories",
    title: "Criar categorias",
    description: "Organize seus produtos por tipo para facilitar buscas e relatórios.",
    href: "/categories",
  },
  {
    id: "products",
    title: "Cadastrar produtos",
    description: "Adicione nome, preço e estoque inicial para começar a operar.",
    href: "/products",
  },
  {
    id: "customers",
    title: "Cadastrar clientes",
    description: "Monte sua base para registrar vendas e acompanhar histórico.",
    href: "/customers",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [completedSteps, setCompletedSteps] = useState<Record<SetupStep["id"], boolean>>({
    categories: false,
    products: false,
    customers: false,
  });

  const progress = useMemo(() => {
    const done = Object.values(completedSteps).filter(Boolean).length;
    return {
      done,
      total: SETUP_STEPS.length,
      percent: Math.round((done / SETUP_STEPS.length) * 100),
    };
  }, [completedSteps]);

  const toggleStep = (stepId: SetupStep["id"]) => {
    setCompletedSteps((current) => ({ ...current, [stepId]: !current[stepId] }));
  };

  const finishOnboarding = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem(ONBOARDING_DONE_KEY, "1");
    }
    router.push("/dashboard");
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Onboarding</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Assistente inicial de configuração</h2>
        <p className="mt-1 text-sm text-slate-600">Conclua as etapas abaixo para preparar seu catálogo e acelerar o início das vendas.</p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-medium text-slate-700">Progresso da configuração</p>
          <p className="text-sm font-semibold text-slate-900">{progress.done}/{progress.total}</p>
        </div>
        <div className="mt-3 h-2 rounded-full bg-slate-200">
          <div className="h-2 rounded-full bg-slate-900 transition-all" style={{ width: progress.percent + "%" }} />
        </div>
      </section>

      <section className="space-y-3">
        {SETUP_STEPS.map((step) => (
          <article key={step.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-slate-900">{step.title}</h3>
                <p className="text-sm text-slate-600">{step.description}</p>
              </div>
              <input
                type="checkbox"
                checked={completedSteps[step.id]}
                onChange={() => toggleStep(step.id)}
                className="mt-1 h-4 w-4 rounded border-slate-300"
                aria-label={"Marcar etapa " + step.title + " como concluida"}
              />
            </div>
            <div className="mt-3">
              <Link href={step.href} className="text-sm font-semibold text-slate-900 underline">
                Ir para {step.title.toLowerCase()}
              </Link>
            </div>
          </article>
        ))}
      </section>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={finishOnboarding}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Finalizar assistente
        </button>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Continuar depois
        </button>
      </div>
    </div>
  );
}
