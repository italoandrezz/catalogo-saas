"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { resolveImageUrl } from "@/lib/api";
import { formatCustomerPhone } from "@/lib/customer-format";
import type { Product } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
const TENANT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type SortMode = "relevance" | "best-sellers" | "highest-discount" | "newest" | "price-low" | "price-high";
type LeadInfo = {
  name: string;
  phone: string;
};

type InterestItem = {
  product: Product;
  quantity: number;
  variation: string;
  note: string;
};

type SharedInterestPayload = {
  v: 1;
  items: Array<{ id: string; quantity: number; variation?: string; note?: string }>;
  lead?: LeadInfo;
};

const STORAGE_KEY_PREFIX = "catalog-interest-list";

function getStorageKey(tenantId: string): string {
  return `${STORAGE_KEY_PREFIX}:${tenantId}`;
}

function getDefaultLeadInfo(): LeadInfo {
  return {
    name: "",
    phone: "",
  };
}



function parseSharedPayload(encodedValue: string | null): SharedInterestPayload | null {
  if (!encodedValue) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(encodedValue)) as Partial<SharedInterestPayload>;
    if (parsed.v !== 1 || !Array.isArray(parsed.items)) return null;
    return {
      v: 1,
      items: parsed.items
        .filter((item): item is { id: string; quantity: number; variation?: string; note?: string } => Boolean(item?.id))
        .map((item) => ({
          id: item.id,
          quantity: Math.max(1, Number(item.quantity) || 1),
          variation: item.variation ?? "",
          note: item.note ?? "",
        })),
      lead: {
        name: parsed.lead?.name ?? "",
        phone: parsed.lead?.phone ?? "",
      },
    };
  } catch {
    return null;
  }
}

async function fetchPublicProducts(tenantId: string): Promise<Product[]> {
  const res = await fetch(`${API_URL}/api/public/${tenantId}/products`);
  if (!res.ok) {
    throw new Error(res.status === 404 ? "Catálogo não encontrado." : "Erro ao carregar o catálogo.");
  }
  return res.json() as Promise<Product[]>;
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function editDistanceOneOrLess(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  if (a === b) return true;

  let i = 0;
  let j = 0;
  let edits = 0;

  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i += 1;
      j += 1;
      continue;
    }

    edits += 1;
    if (edits > 1) return false;

    if (a.length > b.length) {
      i += 1;
    } else if (b.length > a.length) {
      j += 1;
    } else {
      i += 1;
      j += 1;
    }
  }

  if (i < a.length || j < b.length) edits += 1;
  return edits <= 1;
}

function getSearchScore(query: string, product: Product): number {
  if (!query) return 1;

  const normalizedQuery = normalizeText(query);
  const candidateParts = [
    product.name,
    product.categoryName ?? "",
    product.description ?? "",
    product.variations ?? "",
  ].map(normalizeText);
  const haystack = candidateParts.join(" ");

  if (haystack.includes(normalizedQuery)) {
    if (normalizeText(product.name).startsWith(normalizedQuery)) return 100;
    if (normalizeText(product.name).includes(normalizedQuery)) return 90;
    return 70;
  }

  const words = haystack.split(/\s+/).filter(Boolean);
  const queryWords = normalizedQuery.split(/\s+/).filter(Boolean);
  let fuzzyHits = 0;

  for (const qWord of queryWords) {
    const hasNearWord = words.some((word) => editDistanceOneOrLess(word, qWord));
    if (hasNearWord) fuzzyHits += 1;
  }

  if (fuzzyHits > 0) {
    return 40 + fuzzyHits;
  }

  return 0;
}

function getHybridCatalogScore(product: Product, searchScore: number): number {
  const createdAt = new Date(product.createdAt).getTime();
  const now = Date.now();
  const ageInDays = Number.isNaN(createdAt) ? 365 : Math.max(0, (now - createdAt) / (1000 * 60 * 60 * 24));

  // Curva simples: mais novo = pontua mais, caindo gradualmente ate ~60 dias.
  const noveltyBoost = Math.max(0, 20 - Math.min(20, ageInDays / 3));
  const stockBoost = product.stock > 0 ? Math.min(10, product.stock / 3) : -20;
  const bestSellerBoost = product.badgeBestSeller ? 25 : 0;
  const promoBoost = product.badgePromo ? 8 : 0;

  return searchScore + noveltyBoost + stockBoost + bestSellerBoost + promoBoost;
}

function getGalleryImages(product: Product): string[] {
  const gallery = (product.imageGallery ?? "")
    .split(/\r?\n|,|;/)
    .map((item) => item.trim())
    .filter(Boolean);

  const all = [product.imageUrl ?? "", ...gallery].filter(Boolean);
  return Array.from(new Set(all));
}

function getVariationItems(product: Product): string[] {
  return (product.variations ?? "")
    .split(/\r?\n|,|;/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function PublicCatalogPage() {
  const params = useParams<{ tenantId: string }>();
  const tenantId = params?.tenantId;
  const hasValidTenantId = Boolean(tenantId && TENANT_ID_PATTERN.test(tenantId));

  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortMode>("relevance");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [interestList, setInterestList] = useState<InterestItem[]>([]);
  const [leadInfo, setLeadInfo] = useState<LeadInfo>(getDefaultLeadInfo());

  useEffect(() => {
    if (!tenantId || !hasValidTenantId) {
      return;
    }

    let cancelled = false;

    const loadProducts = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const data = await fetchPublicProducts(tenantId);
        if (!cancelled) {
          setProducts(data);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setErrorMessage(err instanceof Error ? err.message : "Erro desconhecido.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadProducts();

    return () => {
      cancelled = true;
    };
  }, [hasValidTenantId, tenantId]);

  useEffect(() => {
    if (!tenantId || !hasValidTenantId || typeof window === "undefined") return;

    const storageKey = getStorageKey(tenantId);
    const rawStored = window.localStorage.getItem(storageKey);
    if (rawStored) {
      try {
        const parsed = JSON.parse(rawStored) as {
          items?: Array<{ productId: string; quantity: number; variation?: string; note?: string }>;
          lead?: LeadInfo;
        };

        if (parsed.lead) {
          setLeadInfo({
            name: parsed.lead.name ?? "",
            phone: formatCustomerPhone(parsed.lead.phone ?? ""),
          });
        }

        if (parsed.items && products.length > 0) {
          const rehydratedItems: InterestItem[] = parsed.items
            .map((entry) => {
              const product = products.find((item) => item.id === entry.productId);
              if (!product) return null;
              return {
                product,
                quantity: Math.max(1, Number(entry.quantity) || 1),
                variation: entry.variation ?? "",
                note: entry.note ?? "",
              };
            })
            .filter((item): item is InterestItem => item !== null);

          setInterestList(rehydratedItems);
        }
      } catch {
        // Ignora payload inválido do localStorage para não quebrar a experiência do catálogo.
      }
    }

    const query = new URLSearchParams(window.location.search);
    const sharedPayload = parseSharedPayload(query.get("interest"));
    if (sharedPayload && products.length > 0) {
      const sharedItems: InterestItem[] = sharedPayload.items
        .map((entry) => {
          const product = products.find((item) => item.id === entry.id);
          if (!product) return null;
          return {
            product,
            quantity: Math.max(1, Number(entry.quantity) || 1),
            variation: entry.variation ?? "",
            note: entry.note ?? "",
          };
        })
        .filter((item): item is InterestItem => item !== null);

      if (sharedItems.length > 0) {
        setInterestList(sharedItems);
      }
      if (sharedPayload.lead) {
        setLeadInfo(sharedPayload.lead);
      }
    }
  }, [hasValidTenantId, products, tenantId]);

  useEffect(() => {
    if (!tenantId || !hasValidTenantId || typeof window === "undefined" || products.length === 0) return;

    const storageKey = getStorageKey(tenantId);
    const payload = {
      items: interestList.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        variation: item.variation,
        note: item.note,
      })),
      lead: leadInfo,
    };

    window.localStorage.setItem(storageKey, JSON.stringify(payload));
  }, [hasValidTenantId, interestList, leadInfo, products.length, tenantId]);

  const uniqueCategories = Array.from(
    new Set(products.filter((p) => p.categoryName).map((p) => p.categoryName))
  ) as string[];

  const scoredProducts = products
    .map((product) => {
      const searchScore = getSearchScore(searchQuery, product);
      const hybridScore = getHybridCatalogScore(product, searchScore);
      return { product, score: searchScore, hybridScore };
    })
    .filter((item) => item.score > 0);

  const filteredProducts = scoredProducts.filter(({ product }) => {
    if (selectedCategory && product.categoryName !== selectedCategory) return false;
    if (product.stock <= 0) return false;
    return true;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === "relevance") {
      return b.hybridScore - a.hybridScore;
    }
    if (sortBy === "best-sellers") {
      if (a.product.badgeBestSeller !== b.product.badgeBestSeller) {
        return Number(b.product.badgeBestSeller) - Number(a.product.badgeBestSeller);
      }
      return b.hybridScore - a.hybridScore;
    }
    if (sortBy === "highest-discount") {
      if (a.product.badgePromo !== b.product.badgePromo) {
        return Number(b.product.badgePromo) - Number(a.product.badgePromo);
      }
      return (a.product.price ?? 0) - (b.product.price ?? 0);
    }
    if (sortBy === "newest") {
      return new Date(b.product.createdAt).getTime() - new Date(a.product.createdAt).getTime();
    }
    if (sortBy === "price-low") {
      return (a.product.price ?? 0) - (b.product.price ?? 0);
    } else {
      return (b.product.price ?? 0) - (a.product.price ?? 0);
    }
  });

  function addToInterestList(product: Product, options?: { variation?: string; note?: string }) {
    setInterestList((previous) => {
      const existing = previous.find((item) => item.product.id === product.id);
      if (existing) {
        return previous.map((item) =>
          item.product.id === product.id
            ? {
              ...item,
              quantity: item.quantity + 1,
              variation: options?.variation ?? item.variation,
              note: options?.note ?? item.note,
            }
            : item,
        );
      }
      return [...previous, { product, quantity: 1, variation: options?.variation ?? "", note: options?.note ?? "" }];
    });
  }

  function updateInterestQuantity(productId: string, nextQuantity: number) {
    setInterestList((previous) =>
      previous
        .map((item) => (item.product.id === productId ? { ...item, quantity: Math.max(1, nextQuantity) } : item))
        .filter((item) => item.quantity > 0),
    );
  }

  function removeFromInterestList(productId: string) {
    setInterestList((previous) => previous.filter((item) => item.product.id !== productId));
  }

  function updateInterestMeta(productId: string, nextMeta: { variation?: string; note?: string }) {
    setInterestList((previous) =>
      previous.map((item) =>
        item.product.id === productId
          ? {
            ...item,
            variation: nextMeta.variation ?? item.variation,
            note: nextMeta.note ?? item.note,
          }
          : item,
      ),
    );
  }

  function handleLeadInfoChange(nextInfo: Partial<LeadInfo>) {
    setLeadInfo((previous) => ({
      ...previous,
      ...nextInfo,
      phone: nextInfo.phone !== undefined ? formatCustomerPhone(nextInfo.phone) : previous.phone,
    }));
  }

  function buildShareableLink(): string {
    if (typeof window === "undefined") return "";

    const payload: SharedInterestPayload = {
      v: 1,
      items: interestList.map((item) => ({
        id: item.product.id,
        quantity: item.quantity,
        variation: item.variation || undefined,
        note: item.note || undefined,
      })),
      lead: leadInfo,
    };

    const url = new URL(window.location.href);
    url.searchParams.set("interest", encodeURIComponent(JSON.stringify(payload)));
    return url.toString();
  }

  async function handleCopyInterestLink() {
    const url = buildShareableLink();
    if (!url) return;

    try {
      await navigator.clipboard.writeText(url);
      window.alert("Link da lista copiado com sucesso.");
    } catch {
      window.prompt("Copie o link da lista:", url);
    }
  }

  function handleSendInterestToWhatsApp() {
    if (!interestList.length) return;

    const lines = interestList.map((item) => {
      const price = item.product.price != null
        ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.product.price)
        : "Preço sob consulta";
        const details = [
          `- ${item.product.name}`,
          `Qtd: ${item.quantity}`,
          `Preço: ${price}`,
          item.variation ? `Variação: ${item.variation}` : "",
          item.note ? `Obs: ${item.note}` : "",
        ].filter(Boolean);
        return details.join(" | ");
    });

    const leadLines = [
      leadInfo.name ? `Nome: ${leadInfo.name}` : "",
      leadInfo.phone ? `Telefone: ${leadInfo.phone}` : "",
    ].filter(Boolean);

    const shareableLink = buildShareableLink();

    const message = [
      "Olá! Tenho interesse nos produtos abaixo:",
      "",
      ...leadLines,
      leadLines.length ? "" : "",
      ...lines,
      "",
      shareableLink ? `Link da minha lista: ${shareableLink}` : "",
      shareableLink ? "" : "",
      "Pode me passar mais informações?",
    ].filter(Boolean).join("\n");

    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_10%_10%,#dbeafe,transparent_35%),radial-gradient(circle_at_90%_90%,#e0e7ff,transparent_30%),#f8fafc]">
      {/* Header */}
      <header className="border-b border-slate-200/70 bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto flex max-w-6xl items-center px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-slate-900">Catálogo de Produtos</h1>
            <p className="text-xs text-slate-500">Confira nossos produtos disponíveis</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 space-y-6">
        {/* Search and Filters Toolbar */}
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Buscar produto ou categoria..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm focus:border-slate-400 focus:outline-none"
            />
          </div>

          {/* Filters and Sort */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            {/* Category Filter */}
            <div className="flex-1">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">
                Categoria
              </label>
              <select
                value={selectedCategory ?? ""}
                onChange={(e) => setSelectedCategory(e.target.value || null)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
              >
                <option value="">Todas as categorias</option>
                {uniqueCategories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div className="flex-1">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">
                Ordenar por
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortMode)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
              >
                <option value="relevance">Relevância</option>
                <option value="best-sellers">Mais vendidos</option>
                <option value="highest-discount">Maior desconto</option>
                <option value="newest">Novidade</option>
                <option value="price-low">Preço (menor)</option>
                <option value="price-high">Preço (maior)</option>
              </select>
            </div>


          </div>
        </div>

        {/* States */}
        {isLoading && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        )}

        {!hasValidTenantId && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            Catálogo não encontrado.
          </div>
        )}

        {hasValidTenantId && errorMessage && (
          <div role="alert" aria-live="polite" className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {!isLoading && hasValidTenantId && !errorMessage && filteredProducts.length === 0 && (
          <div className="py-16 text-center text-slate-500">
            {searchQuery ? "Nenhum produto encontrado para esta busca." : "Nenhum produto disponível no momento."}
          </div>
        )}

        {/* Product grid */}
        {!isLoading && hasValidTenantId && !errorMessage && sortedProducts.length > 0 && (
          <>
            <p className="text-sm text-slate-500">
              {sortedProducts.length} produto{sortedProducts.length !== 1 ? "s" : ""} encontrado{sortedProducts.length !== 1 ? "s" : ""}
            </p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {sortedProducts.map(({ product }) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onSelect={() => setSelectedProduct(product)}
                  onQuickAdd={() => addToInterestList(product)}
                />
              ))}
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white/60 py-6 text-center text-xs text-slate-400">
        Powered by Catalog SaaS
      </footer>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          key={selectedProduct.id}
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToInterest={(options) => addToInterestList(selectedProduct, options)}
        />
      )}

      <InterestListPanel
        items={interestList}
        onQuantityChange={updateInterestQuantity}
        onRemove={removeFromInterestList}
        onItemMetaChange={updateInterestMeta}
        leadInfo={leadInfo}
        onLeadInfoChange={handleLeadInfoChange}
        onCopyLink={handleCopyInterestLink}
        onSendWhatsApp={handleSendInterestToWhatsApp}
      />
    </div>
  );
}

function ProductCard({
  product,
  onSelect,
  onQuickAdd,
}: {
  product: Product;
  onSelect: () => void;
  onQuickAdd: () => void;
}) {
  const discPct = product.discountPercent ?? 0;
  const finalPrice = product.price ?? 0;
  const originalPrice = discPct > 0 && finalPrice > 0 ? finalPrice / (1 - discPct / 100) : null;

  const formattedFinal = product.price
    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(product.price)
    : null;
  const formattedOriginal = originalPrice
    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(originalPrice)
    : null;

  const badgeItems = [
    product.badgeNew ? { label: "Novo", className: "bg-blue-100 text-blue-700" } : null,
    product.badgePromo ? { label: "Promoção", className: "bg-rose-100 text-rose-700" } : null,
    product.badgeBestSeller ? { label: "Mais vendido", className: "bg-amber-100 text-amber-700" } : null,
  ].filter(Boolean) as Array<{ label: string; className: string }>;

  const cardImage = getGalleryImages(product)[0];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md hover:-translate-y-0.5 text-left"
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-slate-100">
        {cardImage ? (
          <Image
            src={resolveImageUrl(cardImage)}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="h-full w-full object-cover transition group-hover:scale-105"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-300">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
        )}
        {product.stock === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50">
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">Sem estoque</span>
          </div>
        )}

        {badgeItems.length > 0 && (
          <div className="absolute left-2 top-2 flex flex-wrap gap-1">
            {badgeItems.map((badge) => (
              <span key={badge.label} className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${badge.className}`}>
                {badge.label}
              </span>
            ))}
          </div>
        )}

        {/* Discount badge */}
        {discPct > 0 && (
          <div className="absolute right-2 top-2 rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-bold text-white shadow">
            -{discPct}%
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-1 p-3">
        {product.categoryName && (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            {product.categoryName}
          </span>
        )}
        <p className="text-sm font-medium text-slate-800 leading-snug">{product.name}</p>
        {product.description && (
          <p className="text-xs text-slate-500 line-clamp-2">{product.description}</p>
        )}
        <div className="mt-auto pt-2">
          {formattedFinal ? (
            <div className="flex flex-wrap items-baseline gap-2">
              {formattedOriginal && (
                <span className="text-[10px] font-medium tracking-wide text-slate-400/90 line-through">
                  {formattedOriginal}
                </span>
              )}
              <span className={`text-xl font-extrabold leading-none ${discPct > 0 ? "text-rose-600" : "text-slate-900"}`}>
                {formattedFinal}
              </span>
            </div>
          ) : (
            <span className="text-xs text-slate-400">Preço sob consulta</span>
          )}
        </div>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onQuickAdd();
          }}
          className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
        >
          Adicionar a lista
        </button>
      </div>
    </div>
  );
}

function ProductDetailModal({
  product,
  onClose,
  onAddToInterest,
}: {
  product: Product;
  onClose: () => void;
  onAddToInterest: (options: { variation?: string; note?: string }) => void;
}) {
  const discPct = product.discountPercent ?? 0;
  const finalPrice = product.price ?? 0;
  const originalPrice = discPct > 0 && finalPrice > 0 ? finalPrice / (1 - discPct / 100) : null;

  const formattedPrice = product.price
    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(product.price)
    : null;
  const formattedOriginal = originalPrice
    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(originalPrice)
    : null;

  const galleryImages = getGalleryImages(product);
  const variationItems = getVariationItems(product);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedVariation, setSelectedVariation] = useState("");
  const [note, setNote] = useState("");

  const displayImage = galleryImages[selectedImageIndex] ?? product.imageUrl;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white/95 backdrop-blur px-6 py-4">
          <h2 className="text-xl font-semibold text-slate-900">Detalhes do Produto</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Image */}
          <div className="space-y-3">
            <div className="aspect-square overflow-hidden rounded-xl bg-slate-100">
              {displayImage ? (
                <Image
                  src={resolveImageUrl(displayImage)}
                  alt={product.name}
                  width={800}
                  height={800}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-full items-center justify-center text-slate-300">
                  <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </div>
              )}
            </div>

            {galleryImages.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {galleryImages.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    onClick={() => setSelectedImageIndex(index)}
                    className={`overflow-hidden rounded-lg border ${selectedImageIndex === index ? "border-slate-900" : "border-slate-200"}`}
                  >
                    <Image
                      src={resolveImageUrl(image)}
                      alt={`${product.name} ${index + 1}`}
                      width={112}
                      height={56}
                      className="h-14 w-full object-cover"
                      unoptimized
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1">
              {product.categoryName && (
                <span className="inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  {product.categoryName}
                </span>
              )}
              {product.badgeNew && <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">Novo</span>}
              {product.badgePromo && <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700">Promoção</span>}
              {product.badgeBestSeller && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">Mais vendido</span>}
              {discPct > 0 && (
                <span className="rounded-full bg-rose-500 px-3 py-1 text-xs font-bold text-white">
                  -{discPct}% OFF
                </span>
              )}
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-900">{product.name}</h1>
            </div>

            {product.description && (
              <p className="text-slate-600 leading-relaxed">{product.description}</p>
            )}

            {variationItems.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-700">Variações</h3>
                <div className="flex flex-wrap gap-2">
                  {variationItems.map((variation) => (
                    <span key={variation} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700">
                      {variation}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {variationItems.length > 0 && (
              <div className="space-y-2">
                <label htmlFor="variation-select" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Variação desejada
                </label>
                <select
                  id="variation-select"
                  value={selectedVariation}
                  onChange={(event) => setSelectedVariation(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Selecionar depois no atendimento</option>
                  {variationItems.map((variation) => (
                    <option key={variation} value={variation}>{variation}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="interest-note" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Observação para o atendimento
              </label>
              <textarea
                id="interest-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Ex.: preciso para entrega até sexta"
                className="min-h-20 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>

            {/* Price and availability */}
            <div className="flex items-end justify-between border-t border-slate-200 pt-4">
              <div>
                {formattedPrice ? (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Preço</p>
                    <div className="mt-1.5 flex flex-wrap items-baseline gap-3">
                      {formattedOriginal && (
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-400 line-through">
                          {formattedOriginal}
                        </p>
                      )}
                      <p className={`text-3xl font-extrabold leading-none ${discPct > 0 ? "text-rose-600" : "text-slate-900"}`}>
                        {formattedPrice}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-500">Preço sob consulta</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-slate-500">Disponibilidade</p>
                <p className={`text-sm font-bold ${product.stock > 0 ? "text-green-600" : "text-red-600"}`}>
                  {product.stock > 0 ? "Disponível" : "Indisponível"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onAddToInterest({ variation: selectedVariation, note })}
              className="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
            >
              Adicionar a lista de interesse
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-slate-50/50 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

function InterestListPanel({
  items,
  onQuantityChange,
  onRemove,
  onItemMetaChange,
  leadInfo,
  onLeadInfoChange,
  onCopyLink,
  onSendWhatsApp,
}: {
  items: InterestItem[];
  onQuantityChange: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  onItemMetaChange: (productId: string, nextMeta: { variation?: string; note?: string }) => void;
  leadInfo: LeadInfo;
  onLeadInfoChange: (nextInfo: Partial<LeadInfo>) => void;
  onCopyLink: () => void;
  onSendWhatsApp: () => void;
}) {
  if (items.length === 0) return null;

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <aside className="fixed bottom-4 right-4 z-40 w-full max-w-sm rounded-2xl border border-slate-200 bg-white shadow-2xl">
      <div className="border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-bold text-slate-900">Lista de interesse ({totalItems})</h3>
        <p className="text-xs text-slate-500">Envie seu pedido rápido no WhatsApp</p>
      </div>

      <div className="max-h-60 space-y-2 overflow-y-auto px-4 py-3">
        {items.map((item) => (
          <div key={item.product.id} className="rounded-lg border border-slate-100 bg-slate-50 p-2">
            <p className="text-sm font-semibold text-slate-800">{item.product.name}</p>
            {getVariationItems(item.product).length > 0 && (
              <select
                value={item.variation}
                onChange={(event) => onItemMetaChange(item.product.id, { variation: event.target.value })}
                className="mt-2 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
              >
                <option value="">Variação: selecionar no atendimento</option>
                {getVariationItems(item.product).map((variation) => (
                  <option key={variation} value={variation}>{variation}</option>
                ))}
              </select>
            )}
            <input
              type="text"
              value={item.note}
              onChange={(event) => onItemMetaChange(item.product.id, { note: event.target.value })}
              placeholder="Observação (opcional)"
              className="mt-2 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
            />
            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onQuantityChange(item.product.id, item.quantity - 1)}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
                >
                  -
                </button>
                <span className="min-w-6 text-center text-sm font-semibold">{item.quantity}</span>
                <button
                  type="button"
                  onClick={() => onQuantityChange(item.product.id, item.quantity + 1)}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
                >
                  +
                </button>
              </div>
              <button
                type="button"
                onClick={() => onRemove(item.product.id)}
                className="text-xs font-semibold text-red-600 hover:text-red-700"
              >
                Remover
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-100 p-3">
        <div className="mb-3 grid grid-cols-2 gap-2">
          <input
            type="text"
            value={leadInfo.name}
            onChange={(event) => onLeadInfoChange({ name: event.target.value })}
            placeholder="Seu nome"
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs"
          />
          <input
            type="tel"
            value={leadInfo.phone}
            onChange={(event) => onLeadInfoChange({ phone: event.target.value })}
            placeholder="(00) 00000-0000"
            inputMode="tel"
            maxLength={15}
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs"
          />
        </div>
        <button
          type="button"
          onClick={onCopyLink}
          className="mb-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          Copiar link da lista
        </button>
        <button
          type="button"
          onClick={onSendWhatsApp}
          className="w-full rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"
        >
          Enviar pedido no WhatsApp
        </button>
      </div>
    </aside>
  );
}
