"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { authService } from "@/services/auth-service";
import { useProducts } from "@/hooks/use-products";
import { useCustomers } from "@/hooks/use-customers";
import { useCategories } from "@/hooks/use-categories";

const ONBOARDING_DONE_KEY = "catalog_onboarding_done";

export default function DashboardPage() {
  const { items: products, isLoading: loadingProducts } = useProducts();
  const { items: customers, isLoading: loadingCustomers } = useCustomers();
  const { items: categories, isLoading: loadingCategories } = useCategories();
  const isLoading = loadingProducts || loadingCustomers || loadingCategories;
  const tenantId = useMemo(() => authService.getSession()?.tenantId ?? null, []);
  const [showSetupAssistant, setShowSetupAssistant] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setShowSetupAssistant(localStorage.getItem(ONBOARDING_DONE_KEY) !== "1");
  }, []);

  const lowStockProducts = products.filter((p) => p.stock < 5);
  const outOfStock = lowStockProducts.filter((p) => p.stock === 0).length;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Painel</h2>
        <p className="mt-1 text-sm text-slate-500">Visão geral do seu catálogo</p>
      </div>

      {showSetupAssistant && (
        <section className="rounded-xl border border-blue-200 bg-blue-50/80 p-4">
          <p className="text-sm font-semibold text-blue-900">Assistente inicial de configuração</p>
          <p className="mt-1 text-sm text-blue-800">Configure as etapas essenciais para começar a vender com mais rapidez.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/onboarding" className="rounded-md bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800">
              Abrir assistente
            </Link>
            <button
              type="button"
              onClick={() => setShowSetupAssistant(false)}
              className="rounded-md border border-blue-300 bg-white px-3 py-2 text-sm font-medium text-blue-800 hover:bg-blue-100"
            >
              Agora não
            </button>
          </div>
        </section>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="Produtos"
          value={products.length}
          color="default"
          icon={<BoxIcon />}
        />
        <MetricCard
          label="Clientes"
          value={customers.length}
          color="default"
          icon={<UsersIcon />}
        />
        <MetricCard
          label="Categorias"
          value={categories.length}
          color="default"
          icon={<TagIcon />}
        />
        <MetricCard
          label="Estoque baixo"
          value={lowStockProducts.length}
          color={lowStockProducts.length > 0 ? "muted" : "default"}
          icon={<AlertIcon />}
          subtitle={outOfStock > 0 ? `${outOfStock} sem estoque` : undefined}
        />
      </div>

      {/* Low stock list */}
      {lowStockProducts.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-base font-semibold text-slate-800">Produtos com estoque baixo (&lt; 5)</h3>
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {lowStockProducts.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">{p.name}</p>
                  {p.categoryName && (
                    <p className="text-xs text-slate-500">{p.categoryName}</p>
                  )}
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    p.stock === 0
                      ? "bg-slate-800 text-white"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {p.stock === 0 ? "Sem estoque" : `${p.stock} un.`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Public catalog link */}
      {tenantId && (
        <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Link público do catálogo
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Compartilhe este link para que seus clientes vejam os produtos disponíveis.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <code className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700">
              /catalog/{tenantId}
            </code>
            <Link
              href={`/catalog/${tenantId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
            >
              Abrir catálogo
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

type MetricCardProps = {
  label: string;
  value: number;
  color: "default" | "muted";
  icon: React.ReactNode;
  subtitle?: string;
};

const colorMap = {
  default: "border-slate-200 bg-slate-100 text-slate-700",
  muted: "border-slate-300 bg-slate-200 text-slate-700",
};

function MetricCard({ label, value, color, icon, subtitle }: MetricCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg border ${colorMap[color]}`}>
        {icon}
      </div>
      <p className="text-3xl font-bold text-slate-900">{value}</p>
      <p className="mt-0.5 text-sm text-slate-500">{label}</p>
      {subtitle && <p className="mt-0.5 text-xs text-slate-600">{subtitle}</p>}
    </div>
  );
}

function BoxIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
