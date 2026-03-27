import { useState } from "react";

type ResourceTableProps<TItem> = {
  title: string;
  columns: string[];
  rows: TItem[];
  renderRow: (item: TItem) => React.ReactNode[];
  getRowKey?: (item: TItem, index: number) => string;
  emptyMessage: string;
  pageSize?: number;
};

export function ResourceTable<TItem>({
  title,
  columns,
  rows,
  renderRow,
  getRowKey,
  emptyMessage,
  pageSize = 0,
}: ResourceTableProps<TItem>) {
  const [page, setPage] = useState(0);

  const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(rows.length / pageSize)) : 1;
  const safePage = Math.min(page, totalPages - 1);
  const visibleRows = pageSize > 0 ? rows.slice(safePage * pageSize, (safePage + 1) * pageSize) : rows;

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h2>

      <div className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-100">
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-500">
                  {emptyMessage}
                </td>
              </tr>
            )}

            {visibleRows.map((item, index) => {
              const cells = renderRow(item);
              const rowKey = getRowKey ? getRowKey(item, index) : `row-${safePage}-${index}`;
              return (
                <tr key={rowKey} className="transition hover:bg-slate-50">
                  {cells.map((cell, cellIndex) => (
                    <td key={`${rowKey}-cell-${cellIndex}`} className="px-4 py-3 text-slate-700 align-middle">
                      {cell}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pageSize > 0 && totalPages > 1 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Página {safePage + 1} de {totalPages} &mdash; {rows.length} itens
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={safePage === totalPages - 1}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
