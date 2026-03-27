"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useInventory } from "@/hooks/use-inventory";
import { formatCustomerPhone } from "@/lib/customer-format";
import type { Product } from "@/types";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
type SortOption = "name-asc" | "name-desc" | "stock-asc" | "stock-desc" | "price-asc" | "price-desc";

export default function InventoryPage() {
  const { products, isLoading, errorMessage, actionErrorMessage, refresh, addStock, adjustStock, recordSale } =
    useInventory();

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);
  const [sortOption, setSortOption] = useState<SortOption>("name-asc");
  const [modalProduct, setModalProduct] = useState<Product | null>(null);
  const [activeTab, setActiveTab] = useState<"add" | "adjust" | "sale">("add");
  const [isMounted, setIsMounted] = useState(false);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [addQuantity, setAddQuantity] = useState("");
  const [adjustQuantity, setAdjustQuantity] = useState("");
  const [saleQuantity, setSaleQuantity] = useState("");
  const [saleLead, setSaleLead] = useState({ name: "", phone: "" });
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.categoryName?.toLowerCase().includes(q),
    );
  }, [products, searchQuery]);

  const sortedProducts = useMemo(() => {
    const items = [...filteredProducts];

    items.sort((left, right) => {
      switch (sortOption) {
        case "name-desc":
          return right.name.localeCompare(left.name, "pt-BR");
        case "stock-asc":
          return left.stock - right.stock || left.name.localeCompare(right.name, "pt-BR");
        case "stock-desc":
          return right.stock - left.stock || left.name.localeCompare(right.name, "pt-BR");
        case "price-asc":
          return (left.price ?? 0) - (right.price ?? 0) || left.name.localeCompare(right.name, "pt-BR");
        case "price-desc":
          return (right.price ?? 0) - (left.price ?? 0) || left.name.localeCompare(right.name, "pt-BR");
        case "name-asc":
        default:
          return left.name.localeCompare(right.name, "pt-BR");
      }
    });

    return items;
  }, [filteredProducts, sortOption]);

  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedProducts = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sortedProducts.slice(start, start + pageSize);
  }, [pageSize, safePage, sortedProducts]);

  const visibleRange = useMemo(() => {
    if (sortedProducts.length === 0) {
      return { start: 0, end: 0 };
    }

    const start = (safePage - 1) * pageSize + 1;
    const end = Math.min(safePage * pageSize, sortedProducts.length);
    return { start, end };
  }, [pageSize, safePage, sortedProducts.length]);

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

  function openModal(product: Product) {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }

    const latest = products.find((p) => p.id === product.id) ?? product;
    setModalProduct(latest);
    setActiveTab("add");
    setAddQuantity("");
    setAdjustQuantity(String(latest.stock));
    setSaleQuantity("");
    setSaleLead({ name: "", phone: "" });
    setSuccessMessage(null);
    setLocalError(null);

    requestAnimationFrame(() => setIsDrawerVisible(true));
  }

  function closeModal() {
    setIsDrawerVisible(false);
    setSuccessMessage(null);
    setLocalError(null);

    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }

    closeTimeoutRef.current = setTimeout(() => {
      setModalProduct(null);
      closeTimeoutRef.current = null;
    }, 220);
  }

  useEffect(() => {
    if (modalProduct) {
      const latest = products.find((p) => p.id === modalProduct.id);
      if (latest) setModalProduct(latest);
    }
  }, [products, modalProduct?.id]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!modalProduct) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeModal();
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [modalProduct]);

  const handleAddStock = async () => {
    if (!modalProduct || !addQuantity || Number(addQuantity) <= 0) return;
    setIsProcessing(true);
    setLocalError(null);
    try {
      await addStock(modalProduct.id, Number(addQuantity));
      setSuccessMessage("Adicionado " + addQuantity + " unidade(s)");
      setAddQuantity("");
      setTimeout(() => setSuccessMessage(null), 2500);
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : "Erro ao adicionar estoque.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAdjustStock = async () => {
    if (!modalProduct || adjustQuantity === "") return;
    const val = Number(adjustQuantity);
    if (isNaN(val) || val < 0) return;
    setIsProcessing(true);
    setLocalError(null);
    try {
      await adjustStock(modalProduct.id, val);
      setSuccessMessage("Estoque ajustado para " + val);
      setTimeout(() => setSuccessMessage(null), 2500);
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : "Erro ao ajustar estoque.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePhoneChange = (value: string) => {
    setSaleLead((prev) => ({ ...prev, phone: formatCustomerPhone(value) }));
  };

  const handleRecordSale = async () => {
    if (!modalProduct || !saleQuantity || Number(saleQuantity) <= 0) return;
    if (modalProduct.stock < Number(saleQuantity)) {
      setLocalError("Estoque insuficiente!");
      return;
    }
    setIsProcessing(true);
    setLocalError(null);
    try {
      await recordSale(modalProduct.id, Number(saleQuantity), saleLead.name || undefined, saleLead.phone || undefined);
      setSuccessMessage("Venda registrada: " + saleQuantity + " unidade(s)");
      setSaleQuantity("");
      setSaleLead({ name: "", phone: "" });
      setTimeout(() => setSuccessMessage(null), 2500);
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : "Erro ao registrar venda.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return <p className="text-sm text-slate-600">Carregando produtos...</p>;
  }

  const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= 5).length;
  const outOfStockCount = products.filter((p) => p.stock === 0).length;

  return (
    <div className="space-y-6">
      {errorMessage && (
        <div className="flex items-center gap-3 rounded-lg border border-slate-300 bg-slate-100 px-4 py-3">
          <p role="alert" className="text-sm text-slate-700">{errorMessage}</p>
          <button type="button" onClick={() => void refresh()} className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200">
            Tentar novamente
          </button>
        </div>
      )}
      {actionErrorMessage && (
        <p role="alert" className="rounded-lg border border-slate-300 bg-slate-100 px-4 py-2 text-sm text-slate-700">{actionErrorMessage}</p>
      )}

      <div>
        <h2 className="text-xl font-semibold text-slate-900">Gerenciamento de Estoque</h2>
        <p className="text-xs text-slate-500 mt-1">Clique em um produto para gerenciar o estoque.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-slate-900">{products.length}</p>
          <p className="text-xs text-slate-500 mt-1">Produtos</p>
        </div>
        <div className="rounded-lg border border-slate-300 bg-slate-100 p-4 text-center">
          <p className="text-2xl font-bold text-slate-700">{lowStockCount}</p>
          <p className="text-xs text-slate-600 mt-1">Estoque baixo</p>
        </div>
        <div className="rounded-lg border border-slate-300 bg-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-slate-800">{outOfStockCount}</p>
          <p className="text-xs text-slate-700 mt-1">Sem estoque</p>
        </div>
      </div>

      <div className="relative">
        <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Buscar produto..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-slate-400 focus:outline-none"
        />
      </div>

      {sortedProducts.length === 0 ? (
        <p className="py-8 text-center text-slate-500">Nenhum produto encontrado.</p>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Exibindo {visibleRange.start}-{visibleRange.end} de {sortedProducts.length} produtos
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                Ordenar por
                <select
                  value={sortOption}
                  onChange={(e) => {
                    setSortOption(e.target.value as SortOption);
                    setCurrentPage(1);
                  }}
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-slate-400 focus:outline-none"
                >
                  <option value="name-asc">Nome: A-Z</option>
                  <option value="name-desc">Nome: Z-A</option>
                  <option value="stock-asc">Estoque: menor para maior</option>
                  <option value="stock-desc">Estoque: maior para menor</option>
                  <option value="price-asc">Preço: menor para maior</option>
                  <option value="price-desc">Preço: maior para menor</option>
                </select>
              </label>

              <label className="flex items-center gap-2 text-sm text-slate-600">
                Itens por página
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value) as (typeof PAGE_SIZE_OPTIONS)[number]);
                    setCurrentPage(1);
                  }}
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-slate-400 focus:outline-none"
                >
                  {PAGE_SIZE_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <ul className="divide-y divide-slate-100">
              {paginatedProducts.map((product) => (
                <li key={product.id} className="px-4 py-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-semibold text-slate-900">{product.name}</h3>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                          {product.categoryName || "Sem categoria"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(product.price ?? 0)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                      <div className="min-w-[110px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center">
                        <p className="text-xs text-slate-500">Estoque</p>
                        <p className={"text-lg font-bold leading-none " + (product.stock > 5 ? "text-slate-800" : product.stock > 0 ? "text-slate-600" : "text-slate-500")}>
                          {product.stock}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => openModal(product)}
                        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
                      >
                        Gerenciar estoque
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {totalPages > 1 && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Página {safePage} de {totalPages}
              </p>
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
                      <span key={`ellipsis-${index}`} className="px-2 text-sm text-slate-400">
                        ...
                      </span>
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
                  Próxima
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {isMounted &&
        modalProduct &&
        createPortal(
          <div className="fixed inset-0 z-50">
            <button
              type="button"
              aria-label="Fechar painel"
              onClick={closeModal}
              className={"absolute inset-0 bg-slate-950/25 transition-opacity duration-200 " + (isDrawerVisible ? "opacity-100" : "opacity-0")}
            />

            <aside
              className={"absolute inset-y-0 right-0 w-full border-l border-slate-200 bg-white shadow-2xl transition-transform duration-200 ease-out sm:max-w-md " +
                (isDrawerVisible ? "translate-x-0" : "translate-x-full")}
              aria-label="Painel de estoque"
            >
              <div className="flex h-full flex-col">
                <div className="shrink-0 border-b border-slate-200 px-4 py-4 sm:px-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900">{modalProduct.name}</h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Estoque atual: <span className={"font-bold " + (modalProduct.stock > 5 ? "text-slate-800" : modalProduct.stock > 0 ? "text-slate-600" : "text-slate-500")}>{modalProduct.stock} unid.</span>
                    </p>
                  </div>
                  <button type="button" onClick={closeModal} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Fechar painel">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              </div>

              <div className="shrink-0 border-b border-slate-200">
                <div className="flex">
                  {(["add", "adjust", "sale"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={"flex-1 py-2.5 text-xs font-semibold transition " + (activeTab === tab ? "border-b-2 border-slate-900 text-slate-900" : "text-slate-500 hover:text-slate-700")}
                    >
                      {tab === "add" ? "Adicionar" : tab === "adjust" ? "Ajustar" : "Venda"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
                {successMessage && (
                  <p className="rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-700">{successMessage}</p>
                )}
                {localError && (
                  <p className="rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-700">{localError}</p>
                )}

                {activeTab === "add" && (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-500">Adiciona unidades ao estoque existente.</p>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        value={addQuantity}
                        onChange={(e) => setAddQuantity(e.target.value)}
                        placeholder="Quantidade a adicionar"
                        disabled={isProcessing}
                        className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-50"
                      />
                      <button
                        type="button"
                        onClick={handleAddStock}
                        disabled={isProcessing || !addQuantity || Number(addQuantity) <= 0}
                        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:bg-slate-300"
                      >
                        {isProcessing ? "..." : "Confirmar"}
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === "adjust" && (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-500">Define o estoque exato (ex: apos contagem fisica).</p>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="0"
                        value={adjustQuantity}
                        onChange={(e) => setAdjustQuantity(e.target.value)}
                        placeholder="Novo valor de estoque"
                        disabled={isProcessing}
                        className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-50"
                      />
                      <button
                        type="button"
                        onClick={handleAdjustStock}
                        disabled={isProcessing || adjustQuantity === "" || Number(adjustQuantity) < 0}
                        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:bg-slate-300"
                      >
                        {isProcessing ? "..." : "Ajustar"}
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === "sale" && (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-500">Registra uma venda e deduz do estoque.</p>
                    <input
                      type="number"
                      min="1"
                      max={modalProduct.stock}
                      value={saleQuantity}
                      onChange={(e) => setSaleQuantity(e.target.value)}
                      placeholder={"Quantidade (max: " + modalProduct.stock + ")"}
                      disabled={isProcessing}
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-50"
                    />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        type="text"
                        value={saleLead.name}
                        onChange={(e) => setSaleLead((p) => ({ ...p, name: e.target.value }))}
                        placeholder="Nome do cliente (opcional)"
                        disabled={isProcessing}
                        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-50"
                      />
                      <input
                        type="tel"
                        value={saleLead.phone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        placeholder="(00) 00000-0000"
                        disabled={isProcessing}
                        inputMode="tel"
                        maxLength={15}
                        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-50"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleRecordSale}
                      disabled={isProcessing || !saleQuantity || Number(saleQuantity) <= 0 || Number(saleQuantity) > modalProduct.stock}
                      className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:bg-slate-300"
                    >
                      {isProcessing ? "Registrando..." : "Confirmar Venda"}
                    </button>
                  </div>
                )}
              </div>

              <div className="shrink-0 border-t border-slate-100 px-4 py-3 sm:px-5">
                <button type="button" onClick={closeModal} className="w-full rounded-md border border-slate-200 py-2 text-sm text-slate-600 hover:bg-slate-50">
                  Fechar
                </button>
              </div>
            </div>
            </aside>
          </div>,
          document.body,
        )}
    </div>
  );
}
