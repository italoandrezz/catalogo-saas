"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { authService } from "@/services/auth-service";
import type { SessionUser } from "@/types";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Painel", indent: false },
  { href: "/products", label: "Produtos", indent: false },
  { href: "/categories", label: "Categorias", indent: false },
  { href: "/customers", label: "Clientes", indent: false },
  { href: "/inventory", label: "Estoque", indent: false },
  { href: "/inventory/history", label: "Histórico", indent: true },
];

type DashboardShellProps = {
  children: React.ReactNode;
};

export function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname();
  const { logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [session, setSession] = useState<SessionUser | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const syncSession = () => {
      setSession(authService.getSession());
    };

    syncSession();
    return authService.subscribeToSessionChanges(syncSession);
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  const initials = session?.name
    ?.split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") ?? "U";

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-300 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-700 text-sm font-bold text-white">C</span>
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Painel</p>
              <h1 className="text-lg font-semibold tracking-tight text-slate-900">Catalog SaaS</h1>
            </div>
          </div>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsMenuOpen((current) => !current)}
              className="flex items-center gap-3 rounded-xl border border-slate-300 bg-white px-3 py-2 text-left transition hover:border-slate-400 hover:bg-slate-50"
              aria-haspopup="menu"
              aria-expanded={isMenuOpen}
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                {initials}
              </span>
              <span className="hidden min-w-0 sm:block">
                <span className="block truncate text-sm font-semibold text-slate-900">
                  {session?.name ?? "Minha conta"}
                </span>
                <span className="block truncate text-xs text-slate-500">
                  {session?.email ?? "Conta autenticada"}
                </span>
              </span>
              <svg
                className={`h-4 w-4 text-slate-500 transition ${isMenuOpen ? "rotate-180" : ""}`}
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd" />
              </svg>
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 top-[calc(100%+0.75rem)] z-40 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_60px_-24px_rgba(15,23,42,0.35)]" role="menu">
                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-900">{session?.name ?? "Minha conta"}</p>
                  <p className="mt-1 text-xs text-slate-500">{session?.role ?? "USUÁRIO"}</p>
                </div>
                <div className="p-2">
                  <Link
                    href="/profile"
                    className="flex items-center rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                    role="menuitem"
                  >
                    Perfil
                  </Link>
                  <Link
                    href="/profile/password"
                    className="flex items-center rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                    role="menuitem"
                  >
                    Alterar senha
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      void logout();
                    }}
                    className="flex w-full items-center rounded-xl px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                    role="menuitem"
                  >
                    Sair
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-[240px_1fr]">
        <aside className="surface-card fade-up h-fit p-3">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Navegação</p>
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-xl px-3 py-2 text-sm font-medium transition ${
                    item.indent ? "ml-3 " : ""
                  }${isActive ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"}`}
                >
                  {item.indent && <span className="mr-1 text-slate-400">↳</span>}
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="surface-card fade-up p-6 [animation-delay:80ms]">{children}</main>
      </div>
    </div>
  );
}
