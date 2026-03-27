"use client";

import { useEffect, useMemo, useState } from "react";
import { CategoryForm } from "@/components/forms/category-form";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { ResourceTable } from "@/components/ui/resource-table";
import { useCategories } from "@/hooks/use-categories";
import { categoryService } from "@/services/category-service";
import type { Category, CategoryPayload } from "@/types";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
type CategorySortOption = "name-asc" | "name-desc";

export default function CategoriesPage() {
  const {
    items,
    isLoading,
    isSubmitting,
    deletingId,
    errorMessage,
    actionErrorMessage,
    createCategory,
    updateCategory,
    deleteCategory,
    refresh,
  } = useCategories();
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryPendingDelete, setCategoryPendingDelete] = useState<Category | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<CategorySortOption>("name-asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [bulkActionError, setBulkActionError] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase();
    if (!q) return items;
    return items.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description ?? "").toLowerCase().includes(q),
    );
  }, [items, searchQuery]);

  const sortedItems = useMemo(() => {
    const next = [...filteredItems];
    next.sort((left, right) => {
      if (sortOption === "name-desc") {
        return right.name.localeCompare(left.name, "pt-BR");
      }
      return left.name.localeCompare(right.name, "pt-BR");
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

  const allFilteredSelected = filteredItems.length > 0 && filteredItems.every((c) => selectedCategoryIds.includes(c.id));

  useEffect(() => {
    setSelectedCategoryIds((previous) => previous.filter((id) => items.some((c) => c.id === id)));
  }, [items]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  async function handleSubmit(payload: CategoryPayload) {
    if (editingCategory) {
      await updateCategory(editingCategory.id, payload);
      setEditingCategory(null);
      return;
    }

    await createCategory(payload);
  }

  async function handleConfirmDelete() {
    if (!categoryPendingDelete) return;
    await deleteCategory(categoryPendingDelete.id);
    if (editingCategory?.id === categoryPendingDelete.id) {
      setEditingCategory(null);
    }
    setCategoryPendingDelete(null);
  }

  async function handleConfirmBulkDelete() {
    if (selectedCategoryIds.length === 0) return;

    setIsBulkDeleting(true);
    setBulkActionError(null);
    try {
      const results = await Promise.allSettled(selectedCategoryIds.map((id) => categoryService.remove(id)));
      const successIds = selectedCategoryIds.filter((_, index) => results[index].status === "fulfilled");
      const failedCount = selectedCategoryIds.length - successIds.length;

      if (editingCategory && selectedCategoryIds.includes(editingCategory.id)) {
        setEditingCategory(null);
      }

      setSelectedCategoryIds((previous) => previous.filter((id) => !successIds.includes(id)));
      await refresh();
      if (failedCount > 0) {
        setBulkActionError(`Nao foi possivel excluir ${failedCount} categoria(s). Verifique dependencias e tente novamente.`);
      } else {
        setBulkDeleteOpen(false);
      }
    } catch {
      setBulkActionError("Falha ao excluir categorias selecionadas.");
    } finally {
      setIsBulkDeleting(false);
    }
  }

  function toggleCategorySelection(id: string) {
    setSelectedCategoryIds((previous) =>
      previous.includes(id) ? previous.filter((itemId) => itemId !== id) : [...previous, id],
    );
  }

  function toggleSelectAllFiltered() {
    if (allFilteredSelected) {
      setSelectedCategoryIds((previous) => previous.filter((id) => !filteredItems.some((item) => item.id === id)));
      return;
    }

    setSelectedCategoryIds((previous) => {
      const next = new Set(previous);
      filteredItems.forEach((item) => next.add(item.id));
      return Array.from(next);
    });
  }

  if (isLoading) {
    return <p className="text-sm text-slate-600">Carregando categorias...</p>;
  }

  return (
    <div className="space-y-6">
      {errorMessage && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p role="alert" aria-live="polite" className="text-sm text-red-700">{errorMessage}</p>
          <button
            type="button"
            onClick={() => {
              void refresh();
            }}
            className="rounded-md border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
          >
            Tentar novamente
          </button>
        </div>
      )}

      <CategoryForm
        initialCategory={editingCategory}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
        onCancelEdit={() => setEditingCategory(null)}
      />

      {actionErrorMessage && <p role="alert" aria-live="polite" className="text-sm text-red-600">{actionErrorMessage}</p>}
      {bulkActionError && <p role="alert" aria-live="polite" className="text-sm text-red-600">{bulkActionError}</p>}

      {/* Toolbar: search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-48 flex-1">
          <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por nome ou descrição..."
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
            setSortOption(e.target.value as CategorySortOption);
            setCurrentPage(1);
          }}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="name-asc">Nome: A-Z</option>
          <option value="name-desc">Nome: Z-A</option>
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
          onClick={toggleSelectAllFiltered}
          disabled={filteredItems.length === 0}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
        >
          {allFilteredSelected ? "Desmarcar filtrados" : "Selecionar filtrados"}
        </button>
        <button
          type="button"
          onClick={() => setBulkDeleteOpen(true)}
          disabled={selectedCategoryIds.length === 0 || isBulkDeleting}
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
        >
          {isBulkDeleting ? "Excluindo..." : `Excluir selecionadas (${selectedCategoryIds.length})`}
        </button>
      </div>

      <p className="text-sm text-slate-500">
        Exibindo {visibleRange.start}-{visibleRange.end} de {sortedItems.length} categorias
      </p>

      <ResourceTable
        title="Categorias"
        columns={["Selecionar", "Name", "Description", "Actions"]}
        rows={paginatedItems}
        getRowKey={(category) => category.id}
        emptyMessage={searchQuery ? "Nenhuma categoria encontrada para esta busca." : "Nenhuma categoria cadastrada ainda."}
        renderRow={(category) => [
          <input
            key={`select-${category.id}`}
            type="checkbox"
            checked={selectedCategoryIds.includes(category.id)}
            onChange={() => toggleCategorySelection(category.id)}
            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
          />,
          category.name,
          category.description || "-",
          <div key={`actions-${category.id}`} className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditingCategory(category)}
              className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              Editar
            </button>
            <button
              type="button"
              onClick={() => setCategoryPendingDelete(category)}
              disabled={deletingId === category.id}
              className="rounded-md border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
            >
              {deletingId === category.id ? "Excluindo..." : "Excluir"}
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
        isOpen={Boolean(categoryPendingDelete)}
        title="Excluir categoria"
        message={
          categoryPendingDelete
            ? `Esta ação remove a categoria "${categoryPendingDelete.name}". Produtos vinculados podem ser afetados.`
            : ""
        }
        confirmLabel="Excluir permanentemente"
        cancelLabel="Manter categoria"
        isProcessing={Boolean(categoryPendingDelete && deletingId === categoryPendingDelete.id)}
        onCancel={() => setCategoryPendingDelete(null)}
        onConfirm={() => { void handleConfirmDelete(); }}
      />

      <ConfirmModal
        isOpen={bulkDeleteOpen}
        title="Excluir categorias selecionadas"
        message={`Esta ação vai excluir ${selectedCategoryIds.length} categoria(s) selecionada(s).`}
        confirmLabel="Excluir selecionadas"
        cancelLabel="Cancelar"
        isProcessing={isBulkDeleting}
        onCancel={() => setBulkDeleteOpen(false)}
        onConfirm={() => { void handleConfirmBulkDelete(); }}
      />
    </div>
  );
}
