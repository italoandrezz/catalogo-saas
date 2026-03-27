"use client";

import { useEffect, useMemo, useState } from "react";
import { useInventory } from "@/hooks/use-inventory";
import { downloadCsv } from "@/lib/export-csv";

type FilterType = "all" | "add" | "adjust" | "remove";
type DateFilter = "today" | "7d" | "30d" | "all";

const PAGE_SIZE = 20;

export default function InventoryHistoryPage() {
  const { operations, isLoading, errorMessage, refresh } = useInventory();
  const [filter, setFilter] = useState<FilterType>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const now = new Date();
    let result = operations;

    if (dateFilter !== "all") {
      const cutoff = new Date(now);
      if (dateFilter === "today") {
        cutoff.setHours(0, 0, 0, 0);
      } else if (dateFilter === "7d") {
        cutoff.setDate(cutoff.getDate() - 7);
      } else {
        cutoff.setDate(cutoff.getDate() - 30);
      }
      result = result.filter((op) => new Date(op.timestamp) >= cutoff);
    }

    if (filter !== "all") {
      result = result.filter((op) => op.type === filter);
    }

    return result;
  }, [operations, filter, dateFilter]);

  const sortedFiltered = useMemo(() => {
    return [...filtered].sort((left, right) => {
      return new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime();
    });
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(sortedFiltered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = sortedFiltered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const stats = useMemo(() => {
    const sales = operations.filter((op) => op.type === "remove");
    const adds = operations.filter((op) => op.type === "add");
    const adjusts = operations.filter((op) => op.type === "adjust");
    const totalSaleUnits = sales.reduce((sum, op) => sum + op.quantity, 0);
    return { salesCount: sales.length, totalSaleUnits, addCount: adds.length, adjustCount: adjusts.length };
  }, [operations]);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  }

  function handleExportCsv() {
    const headers = ["Data/Hora", "Produto", "Tipo", "Quantidade", "Qtde Anterior", "Lead", "Telefone"];
    const TYPE_MAP: Record<string, string> = { add: "Entrada", adjust: "Ajuste", remove: "Venda" };
    const rows = sortedFiltered.map((op) => [
      formatDate(op.timestamp),
      op.productName,
      TYPE_MAP[op.type] ?? op.type,
      String(op.quantity),
      op.previousQuantity !== undefined ? String(op.previousQuantity) : "",
      op.leadName ?? "",
      op.leadPhone ?? "",
    ]);
    downloadCsv("historico-estoque.csv", headers, rows);
  }

  function handleFilterChange(f: FilterType) {
    setFilter(f);
    setPage(1);
  }

  function handleDateFilterChange(d: DateFilter) {
    setDateFilter(d);
    setPage(1);
  }

  const TYPE_LABELS: Record<string, { label: string; classes: string }> = {
    add:    { label: "Entrada",  classes: "bg-slate-100 text-slate-700" },
    adjust: { label: "Ajuste",   classes: "bg-slate-200 text-slate-700" },
    remove: { label: "Venda",    classes: "bg-slate-300 text-slate-800" },
  };

  return (
    <div className="space-y-6">
      {isLoading && <p className="text-sm text-slate-600">Carregando histórico...</p>}
      {errorMessage && (
        <div className="flex items-center gap-3 rounded-lg border border-slate-300 bg-slate-100 px-4 py-3">
          <p role="alert" className="text-sm text-slate-700">{errorMessage}</p>
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
          >
            Atualizar
          </button>
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Histórico de Operações</h2>
          <p className="text-xs text-slate-500 mt-1">Registro de todas as movimentações de estoque.</p>
        </div>
        <button
          type="button"
          onClick={handleExportCsv}
          className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
        >
          Exportar CSV
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-slate-300 bg-slate-200 p-4">
          <p className="text-2xl font-bold text-slate-800">{stats.salesCount}</p>
          <p className="text-xs text-slate-700 mt-1">Vendas registradas</p>
        </div>
        <div className="rounded-lg border border-slate-300 bg-slate-100 p-4">
          <p className="text-2xl font-bold text-slate-700">{stats.totalSaleUnits}</p>
          <p className="text-xs text-slate-600 mt-1">Unidades vendidas</p>
        </div>
        <div className="rounded-lg border border-slate-300 bg-slate-100 p-4">
          <p className="text-2xl font-bold text-slate-700">{stats.addCount}</p>
          <p className="text-xs text-slate-600 mt-1">Entradas de estoque</p>
        </div>
        <div className="rounded-lg border border-slate-300 bg-slate-100 p-4">
          <p className="text-2xl font-bold text-slate-700">{stats.adjustCount}</p>
          <p className="text-xs text-slate-600 mt-1">Ajustes realizados</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex gap-2">
          {(["all", "add", "adjust", "remove"] as FilterType[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => handleFilterChange(f)}
              className={"rounded-full px-3 py-1 text-xs font-semibold transition " + (filter === f ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-100")}
            >
              {f === "all" ? "Todos" : f === "add" ? "Entradas" : f === "adjust" ? "Ajustes" : "Vendas"}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {([["today", "Hoje"], ["7d", "7 dias"], ["30d", "30 dias"], ["all", "Todos"]] as [DateFilter, string][]).map(([d, label]) => (
            <button
              key={d}
              type="button"
              onClick={() => handleDateFilterChange(d)}
              className={"rounded-full px-3 py-1 text-xs font-semibold transition " + (dateFilter === d ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-100")}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {sortedFiltered.length === 0 ? (
        <p className="py-8 text-center text-slate-500">Nenhuma operação encontrada.</p>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-4 py-3">Data / Hora</th>
                  <th className="px-4 py-3">Produto</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3 text-right">Qtde</th>
                  <th className="px-4 py-3">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.map((op) => {
                  const typeInfo = TYPE_LABELS[op.type];
                  return (
                    <tr key={op.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{formatDate(op.timestamp)}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{op.productName}</td>
                      <td className="px-4 py-3">
                        <span className={"rounded-full px-2 py-0.5 text-xs font-semibold " + typeInfo.classes}>
                          {typeInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-700">
                        {op.type === "add" ? "+" : op.type === "remove" ? "-" : ""}
                        {op.quantity}
                        {op.type === "adjust" && op.previousQuantity !== undefined && (
                          <span className="ml-1 text-xs text-slate-400">({op.previousQuantity} → {op.quantity})</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {op.leadName && <span className="font-medium text-slate-700">{op.leadName}</span>}
                        {op.leadPhone && <span className="ml-2 text-slate-400">{op.leadPhone}</span>}
                        {!op.leadName && !op.leadPhone && <span className="text-slate-300">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{sortedFiltered.length} registros · página {safePage} de {totalPages}</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={safePage === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded border border-slate-200 px-2 py-1 disabled:opacity-40 hover:bg-slate-100 transition"
                >
                  ← Anterior
                </button>
                <button
                  type="button"
                  disabled={safePage === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded border border-slate-200 px-2 py-1 disabled:opacity-40 hover:bg-slate-100 transition"
                >
                  Próxima →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
