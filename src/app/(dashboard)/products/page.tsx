"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { ProductForm } from "@/components/forms/product-form";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { ResourceTable } from "@/components/ui/resource-table";
import { useProducts } from "@/hooks/use-products";
import { downloadCsv } from "@/lib/export-csv";
import { resolveImageUrl } from "@/lib/api";
import { categoryService } from "@/services/category-service";
import { productService } from "@/services/product-service";
import type { Category, Product, ProductPayload } from "@/types";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
type ProductSortOption = "name-asc" | "name-desc" | "price-asc" | "price-desc" | "stock-asc" | "stock-desc";

export default function ProductsPage() {
  const {
    items,
    isLoading,
    isSubmitting,
    deletingId,
    togglingId,
    errorMessage,
    actionErrorMessage,
    createProduct,
    updateProduct,
    deleteProduct,
    toggleProductVisibility,
    refresh,
  } = useProducts();
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productPendingDelete, setProductPendingDelete] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryErrorMessage, setCategoryErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sortOption, setSortOption] = useState<ProductSortOption>("name-asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [bulkActionError, setBulkActionError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCategories() {
      try {
        setCategoryErrorMessage(null);
        const response = await categoryService.list();
        setCategories(response);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to load categories.";
        setCategoryErrorMessage(message);
      }
    }
    void loadCategories();
  }, []);

  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return items.filter((p) => {
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.categoryName ?? "").toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q);
      const matchesCategory = !categoryFilter || p.categoryId === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [items, searchQuery, categoryFilter]);

  const sortedItems = useMemo(() => {
    const next = [...filteredItems];

    next.sort((left, right) => {
      switch (sortOption) {
        case "name-desc":
          return right.name.localeCompare(left.name, "pt-BR");
        case "price-asc":
          return (left.price ?? 0) - (right.price ?? 0) || left.name.localeCompare(right.name, "pt-BR");
        case "price-desc":
          return (right.price ?? 0) - (left.price ?? 0) || left.name.localeCompare(right.name, "pt-BR");
        case "stock-asc":
          return left.stock - right.stock || left.name.localeCompare(right.name, "pt-BR");
        case "stock-desc":
          return right.stock - left.stock || left.name.localeCompare(right.name, "pt-BR");
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

  const allFilteredSelected = filteredItems.length > 0 && filteredItems.every((p) => selectedProductIds.includes(p.id));

  useEffect(() => {
    setSelectedProductIds((previous) => previous.filter((id) => items.some((p) => p.id === id)));
  }, [items]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  async function handleSubmit(payload: ProductPayload) {
    if (editingProduct) {
      await updateProduct(editingProduct.id, payload);
      setEditingProduct(null);
      return;
    }
    await createProduct(payload);
  }

  async function handleConfirmDelete() {
    if (!productPendingDelete) return;
    await deleteProduct(productPendingDelete.id);
    if (editingProduct?.id === productPendingDelete.id) setEditingProduct(null);
    setProductPendingDelete(null);
  }

  async function handleConfirmBulkDelete() {
    if (selectedProductIds.length === 0) return;

    setIsBulkDeleting(true);
    setBulkActionError(null);
    try {
      const results = await Promise.allSettled(selectedProductIds.map((id) => productService.remove(id)));
      const successIds = selectedProductIds.filter((_, index) => results[index].status === "fulfilled");
      const failedCount = selectedProductIds.length - successIds.length;

      if (editingProduct && selectedProductIds.includes(editingProduct.id)) {
        setEditingProduct(null);
      }

      setSelectedProductIds((previous) => previous.filter((id) => !successIds.includes(id)));
      await refresh();
      if (failedCount > 0) {
        setBulkActionError(`Nao foi possivel excluir ${failedCount} produto(s). Tente novamente.`);
      } else {
        setBulkDeleteOpen(false);
      }
    } catch {
      setBulkActionError("Falha ao excluir produtos selecionados.");
    } finally {
      setIsBulkDeleting(false);
    }
  }

  function toggleProductSelection(id: string) {
    setSelectedProductIds((previous) =>
      previous.includes(id) ? previous.filter((itemId) => itemId !== id) : [...previous, id],
    );
  }

  function toggleSelectAllFiltered() {
    if (allFilteredSelected) {
      setSelectedProductIds((previous) => previous.filter((id) => !filteredItems.some((item) => item.id === id)));
      return;
    }

    setSelectedProductIds((previous) => {
      const next = new Set(previous);
      filteredItems.forEach((item) => next.add(item.id));
      return Array.from(next);
    });
  }

  function handleExportCsv() {
    const headers = ["Name", "Category", "Price (R$)", "Stock", "Status", "Description"];
    const rows = sortedItems.map((p) => [
      p.name,
      p.categoryName ?? "",
      p.price != null ? String(p.price.toFixed(2)) : "",
      String(p.stock),
      p.active ? "Active" : "Inactive",
      p.description ?? "",
    ]);
    downloadCsv(`products-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  }

  if (isLoading) {
    return <p className="text-sm text-slate-600">Carregando produtos...</p>;
  }

  return (
    <div className="space-y-6">
      {errorMessage && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p role="alert" aria-live="polite" className="text-sm text-red-700">{errorMessage}</p>
          <button type="button" onClick={() => { void refresh(); }} className="rounded-md border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100">
            Try again
          </button>
        </div>
      )}

      <ProductForm
        key={editingProduct?.id ?? "new-product"}
        initialProduct={editingProduct}
        categories={categories}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
        onCancelEdit={() => setEditingProduct(null)}
      />

      {categoryErrorMessage && <p className="text-sm text-red-600">{categoryErrorMessage}</p>}
      {actionErrorMessage && <p role="alert" aria-live="polite" className="text-sm text-red-600">{actionErrorMessage}</p>}
      {bulkActionError && <p role="alert" aria-live="polite" className="text-sm text-red-600">{bulkActionError}</p>}

      {/* Toolbar: filters + sort + paging + actions */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-48 flex-1">
          <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por nome ou categoria..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          value={sortOption}
          onChange={(e) => {
            setSortOption(e.target.value as ProductSortOption);
            setCurrentPage(1);
          }}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="name-asc">Nome: A-Z</option>
          <option value="name-desc">Nome: Z-A</option>
          <option value="price-asc">Preco: menor para maior</option>
          <option value="price-desc">Preco: maior para menor</option>
          <option value="stock-asc">Estoque: menor para maior</option>
          <option value="stock-desc">Estoque: maior para menor</option>
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
          disabled={selectedProductIds.length === 0 || isBulkDeleting}
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
        >
          {isBulkDeleting ? "Excluindo..." : `Excluir selecionados (${selectedProductIds.length})`}
        </button>
      </div>

      <p className="text-sm text-slate-500">
        Exibindo {visibleRange.start}-{visibleRange.end} de {sortedItems.length} produtos
      </p>

      <ResourceTable
        title="Produtos"
        columns={["Selecionar", "Image", "Name", "Category", "Price", "Stock", "Status", "ON/OFF", "Ações"]}
        rows={paginatedItems}
        getRowKey={(product) => product.id}
        emptyMessage={searchQuery || categoryFilter ? "Nenhum produto encontrado para o filtro atual." : "Nenhum produto cadastrado ainda."}
        renderRow={(product) => [
          <input
            key={`select-${product.id}`}
            type="checkbox"
            checked={selectedProductIds.includes(product.id)}
            onChange={() => toggleProductSelection(product.id)}
            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
          />,
          product.imageUrl ? (
            <Image
              key={`image-${product.id}`}
              src={resolveImageUrl(product.imageUrl)}
              alt={product.name}
              width={48}
              height={48}
              className="h-12 w-12 rounded-lg border border-slate-200 object-cover"
              unoptimized
            />
          ) : (
            <div key={`image-${product.id}`} className="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-[10px] font-medium uppercase tracking-wide text-slate-400">No image</div>
          ),
          product.name,
          product.categoryName || "-",
          product.price ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(product.price) : "-",
          String(product.stock),
          product.active ? "Ativo" : "Inativo",
          <div key={`toggle-${product.id}`} className="flex items-center justify-center">
            <button
              type="button"
              onClick={() => { void toggleProductVisibility(product.id, !product.active); }}
              disabled={togglingId === product.id}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${product.active ? "bg-emerald-500" : "bg-slate-300"} ${togglingId === product.id ? "opacity-60" : ""}`}
              title={product.active ? "Desativar" : "Ativar"}
            >
              <span className="sr-only">Alternar visibilidade</span>
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${product.active ? "translate-x-5" : "translate-x-1"}`}
              />
            </button>
          </div>,
          <div key={`actions-${product.id}`} className="relative flex items-center justify-end">
            <details className="group relative">
              <summary
                className="list-none cursor-pointer rounded-md border border-slate-300 bg-white p-1.5 text-slate-600 hover:bg-slate-100"
                title="Ações"
                aria-label="Ações"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <circle cx="12" cy="5" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="12" cy="19" r="2" />
                </svg>
              </summary>
              <div className="absolute right-0 top-8 z-20 w-36 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
                <button
                  type="button"
                  onClick={() => setEditingProduct(product)}
                  className="block w-full border-b border-slate-100 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => setProductPendingDelete(product)}
                  disabled={deletingId === product.id}
                  className="block w-full px-3 py-2 text-left text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                >
                  {deletingId === product.id ? "Excluindo..." : "Excluir"}
                </button>
              </div>
            </details>
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
        isOpen={Boolean(productPendingDelete)}
        title="Delete product"
        message={productPendingDelete ? `This action removes the product "${productPendingDelete.name}" from the active list.` : ""}
        confirmLabel="Delete permanently"
        cancelLabel="Keep product"
        isProcessing={Boolean(productPendingDelete && deletingId === productPendingDelete.id)}
        onCancel={() => setProductPendingDelete(null)}
        onConfirm={() => { void handleConfirmDelete(); }}
      />

      <ConfirmModal
        isOpen={bulkDeleteOpen}
        title="Excluir produtos selecionados"
        message={`Esta ação vai excluir ${selectedProductIds.length} produto(s) selecionado(s).`}
        confirmLabel="Excluir selecionados"
        cancelLabel="Cancelar"
        isProcessing={isBulkDeleting}
        onCancel={() => setBulkDeleteOpen(false)}
        onConfirm={() => { void handleConfirmBulkDelete(); }}
      />
    </div>
  );
}

