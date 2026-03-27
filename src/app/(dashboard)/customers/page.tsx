"use client";

import { useEffect, useMemo, useState } from "react";
import { CustomerForm } from "@/components/forms/customer-form";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { ResourceTable } from "@/components/ui/resource-table";
import { useCustomers } from "@/hooks/use-customers";
import { downloadCsv } from "@/lib/export-csv";
import { formatCustomerPhone } from "@/lib/customer-format";
import { customerService } from "@/services/customer-service";
import type { Customer, CustomerPayload } from "@/types";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
type CustomerSortOption = "name-asc" | "name-desc" | "email-asc" | "email-desc";

export default function CustomersPage() {
  const {
    items,
    isLoading,
    isSubmitting,
    deletingId,
    errorMessage,
    actionErrorMessage,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    refresh,
  } = useCustomers();
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerPendingDelete, setCustomerPendingDelete] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<CustomerSortOption>("name-asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [bulkActionError, setBulkActionError] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase();
    if (!q) return items;
    return items.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q) ||
        (c.phone ?? "").includes(q),
    );
  }, [items, searchQuery]);

  const sortedItems = useMemo(() => {
    const next = [...filteredItems];
    next.sort((left, right) => {
      switch (sortOption) {
        case "name-desc":
          return right.name.localeCompare(left.name, "pt-BR");
        case "email-asc":
          return (left.email ?? "").localeCompare(right.email ?? "", "pt-BR") || left.name.localeCompare(right.name, "pt-BR");
        case "email-desc":
          return (right.email ?? "").localeCompare(left.email ?? "", "pt-BR") || left.name.localeCompare(right.name, "pt-BR");
        case "name-asc":
        default:
          return left.name.localeCompare(right.name, "pt-BR");
      }
    });
    return next;
  }, [filteredItems, sortOption]);

  const totalPages = Math.max(1, Math.ceil(sortedItems.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sortedItems.slice(start, start + pageSize);
  }, [pageSize, safePage, sortedItems]);

  const visibleRange = useMemo(() => {
    if (sortedItems.length === 0) {
      return { start: 0, end: 0 };
    }
    const start = (safePage - 1) * pageSize + 1;
    const end = Math.min(safePage * pageSize, sortedItems.length);
    return { start, end };
  }, [pageSize, safePage, sortedItems.length]);

  const paginationItems = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }
    if (safePage <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages] as const;
    }
    if (safePage >= totalPages - 3) {
      return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages] as const;
    }
    return [1, "...", safePage - 1, safePage, safePage + 1, "...", totalPages] as const;
  }, [safePage, totalPages]);

  const allFilteredSelected = filteredItems.length > 0 && filteredItems.every((c) => selectedCustomerIds.includes(c.id));

  useEffect(() => {
    setSelectedCustomerIds((previous) => previous.filter((id) => items.some((c) => c.id === id)));
  }, [items]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  async function handleSubmit(payload: CustomerPayload) {
    if (editingCustomer) {
      await updateCustomer(editingCustomer.id, payload);
      setEditingCustomer(null);
      return;
    }
    await createCustomer(payload);
  }

  async function handleConfirmDelete() {
    if (!customerPendingDelete) return;
    await deleteCustomer(customerPendingDelete.id);
    if (editingCustomer?.id === customerPendingDelete.id) setEditingCustomer(null);
    setCustomerPendingDelete(null);
  }

  async function handleConfirmBulkDelete() {
    if (selectedCustomerIds.length === 0) return;

    setIsBulkDeleting(true);
    setBulkActionError(null);
    try {
      const results = await Promise.allSettled(selectedCustomerIds.map((id) => customerService.remove(id)));
      const successIds = selectedCustomerIds.filter((_, index) => results[index].status === "fulfilled");
      const failedCount = selectedCustomerIds.length - successIds.length;

      if (editingCustomer && selectedCustomerIds.includes(editingCustomer.id)) {
        setEditingCustomer(null);
      }

      setSelectedCustomerIds((previous) => previous.filter((id) => !successIds.includes(id)));
      await refresh();
      if (failedCount > 0) {
        setBulkActionError(`Nao foi possivel excluir ${failedCount} cliente(s). Tente novamente.`);
      } else {
        setBulkDeleteOpen(false);
      }
    } catch {
      setBulkActionError("Falha ao excluir clientes selecionados.");
    } finally {
      setIsBulkDeleting(false);
    }
  }

  function toggleCustomerSelection(id: string) {
    setSelectedCustomerIds((previous) =>
      previous.includes(id) ? previous.filter((itemId) => itemId !== id) : [...previous, id],
    );
  }

  function toggleSelectAllFiltered() {
    if (allFilteredSelected) {
      setSelectedCustomerIds((previous) => previous.filter((id) => !filteredItems.some((item) => item.id === id)));
      return;
    }

    setSelectedCustomerIds((previous) => {
      const next = new Set(previous);
      filteredItems.forEach((item) => next.add(item.id));
      return Array.from(next);
    });
  }

  function handleExportCsv() {
    const headers = ["Name", "Email", "Phone"];
    const rows = sortedItems.map((c) => [c.name, c.email ?? "", c.phone ? formatCustomerPhone(c.phone) : ""]);
    downloadCsv(`customers-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }

  if (isLoading) {
    return <p className="text-sm text-slate-600">Carregando clientes...</p>;
  }

  return (
    <div className="space-y-6">
      {errorMessage && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p role="alert" aria-live="polite" className="text-sm text-red-700">{errorMessage}</p>
          <button type="button" onClick={() => { void refresh(); }} className="rounded-md border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100">
            Tentar novamente
          </button>
        </div>
      )}

      <CustomerForm
        initialCustomer={editingCustomer}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
        onCancelEdit={() => setEditingCustomer(null)}
      />

      {actionErrorMessage && <p role="alert" aria-live="polite" className="text-sm text-red-600">{actionErrorMessage}</p>}
      {bulkActionError && <p role="alert" aria-live="polite" className="text-sm text-red-600">{bulkActionError}</p>}

      {/* Toolbar: search + export */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-48 flex-1">
          <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por nome, email ou telefone..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <select
          value={sortOption}
          onChange={(e) => {
            setSortOption(e.target.value as CustomerSortOption);
            setCurrentPage(1);
          }}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="name-asc">Nome: A-Z</option>
          <option value="name-desc">Nome: Z-A</option>
          <option value="email-asc">E-mail: A-Z</option>
          <option value="email-desc">E-mail: Z-A</option>
        </select>
        <select
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value) as (typeof PAGE_SIZE_OPTIONS)[number]);
            setCurrentPage(1);
          }}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          {PAGE_SIZE_OPTIONS.map((option) => (
            <option key={option} value={option}>{option} por pagina</option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleExportCsv}
          disabled={sortedItems.length === 0}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
        >
          Exportar CSV
        </button>
        <button
          type="button"
          onClick={toggleSelectAllFiltered}
          disabled={filteredItems.length === 0}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
        >
          {allFilteredSelected ? "Desmarcar filtrados" : "Selecionar filtrados"}
        </button>
        <button
          type="button"
          onClick={() => setBulkDeleteOpen(true)}
          disabled={selectedCustomerIds.length === 0 || isBulkDeleting}
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
        >
          {isBulkDeleting ? "Excluindo..." : `Excluir selecionados (${selectedCustomerIds.length})`}
        </button>
      </div>

      <p className="text-sm text-slate-500">
        Exibindo {visibleRange.start}-{visibleRange.end} de {sortedItems.length} clientes
      </p>

      <ResourceTable
        title="Clientes"
        columns={["Selecionar", "Name", "Email", "Phone", "Actions"]}
        rows={paginatedItems}
        getRowKey={(customer) => customer.id}
        emptyMessage={searchQuery ? "Nenhum cliente encontrado para esta busca." : "Nenhum cliente cadastrado ainda."}
        renderRow={(customer) => [
          <input
            key={`select-${customer.id}`}
            type="checkbox"
            checked={selectedCustomerIds.includes(customer.id)}
            onChange={() => toggleCustomerSelection(customer.id)}
            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
          />,
          customer.name,
          customer.email || "-",
          customer.phone ? formatCustomerPhone(customer.phone) : "-",
          <div key={`actions-${customer.id}`} className="flex gap-2">
            <button type="button" onClick={() => setEditingCustomer(customer)} className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100">Editar</button>
            <button type="button" onClick={() => setCustomerPendingDelete(customer)} disabled={deletingId === customer.id} className="rounded-md border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-60">
              {deletingId === customer.id ? "Excluindo..." : "Excluir"}
            </button>
          </div>,
        ]}
      />

      {totalPages > 1 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">Pagina {safePage} de {totalPages}</p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={safePage === 1}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40"
            >
              Anterior
            </button>
            <div className="flex flex-wrap items-center gap-1">
              {paginationItems.map((item, index) => (
                item === "..." ? (
                  <span key={`ellipsis-${index}`} className="px-2 text-sm text-slate-400">...</span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCurrentPage(item)}
                    className={"min-w-9 rounded-md border px-3 py-2 text-sm font-medium transition " + (item === safePage ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100")}
                  >
                    {item}
                  </button>
                )
              ))}
            </div>
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={safePage === totalPages}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40"
            >
              Proxima
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(customerPendingDelete)}
        title="Excluir cliente"
        message={customerPendingDelete ? `Esta ação remove o cliente "${customerPendingDelete.name}" permanentemente.` : ""}
        confirmLabel="Excluir permanentemente"
        cancelLabel="Manter cliente"
        isProcessing={Boolean(customerPendingDelete && deletingId === customerPendingDelete.id)}
        onCancel={() => setCustomerPendingDelete(null)}
        onConfirm={() => { void handleConfirmDelete(); }}
      />

      <ConfirmModal
        isOpen={bulkDeleteOpen}
        title="Excluir clientes selecionados"
        message={`Esta ação vai excluir ${selectedCustomerIds.length} cliente(s) selecionado(s).`}
        confirmLabel="Excluir selecionados"
        cancelLabel="Cancelar"
        isProcessing={isBulkDeleting}
        onCancel={() => setBulkDeleteOpen(false)}
        onConfirm={() => { void handleConfirmBulkDelete(); }}
      />
    </div>
  );
}
