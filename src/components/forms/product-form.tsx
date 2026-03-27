"use client";

import Image from "next/image";
import { useState } from "react";
import { uploadImage, resolveImageUrl } from "@/lib/api";
import type { Category, Product, ProductPayload } from "@/types";

type ProductFormProps = {
  initialProduct: Product | null;
  categories: Category[];
  isSubmitting: boolean;
  onSubmit: (payload: ProductPayload) => Promise<void>;
  onCancelEdit: () => void;
};

type ProductFormState = {
  name: string;
  description: string;
  price: string;
  /** Todas as imagens em ordem. Índice 0 = capa (imageUrl). */
  allImages: string[];
  badgeNew: boolean;
  badgePromo: boolean;
  badgeBestSeller: boolean;
  categoryId: string;
};

const DISCOUNT_OPTIONS = [0, 5, 10, 15, 20, 25, 30, 40, 50];

function buildAllImages(product: Product | null): string[] {
  const main = product?.imageUrl ?? "";
  const gallery = (product?.imageGallery ?? "")
    .split(/\r?\n|,|;/)
    .map((s) => s.trim())
    .filter(Boolean);
  const all = [main, ...gallery].filter(Boolean);
  return Array.from(new Set(all));
}

function getInitialState(product: Product | null): ProductFormState {
  const discPct = product?.discountPercent ?? 0;
  const rawPrice =
    product?.price != null
      ? discPct > 0
        ? String(parseFloat((Number(product.price) / (1 - discPct / 100)).toFixed(2)))
        : String(product.price)
      : "";
  return {
    name: product?.name ?? "",
    description: product?.description ?? "",
    price: rawPrice,
    allImages: buildAllImages(product),
    badgeNew: Boolean(product?.badgeNew),
    badgePromo: Boolean(product?.badgePromo),
    badgeBestSeller: Boolean(product?.badgeBestSeller),
    categoryId: product?.categoryId ?? "",
  };
}

// ---------------------------------------------------------------------------
// Sub-componente: seletor de imagens com upload real
// ---------------------------------------------------------------------------
function ImageUploadField({
  images,
  onChange,
}: {
  images: string[];
  onChange: (next: string[]) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    setUploading(true);
    setUploadError(null);

    try {
      const urls = await Promise.all(files.map((f) => uploadImage(f)));
      onChange([...images, ...urls]);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Falha no upload.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  function remove(index: number) {
    onChange(images.filter((_, i) => i !== index));
  }

  function setAsCover(index: number) {
    const next = [...images];
    next.splice(index, 1);
    next.unshift(images[index]);
    onChange(next);
  }

  return (
    <div className="space-y-3">
      {images.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {images.map((url, index) => (
            <div key={`${url}-${index}`} className="group relative">
              <Image
                src={resolveImageUrl(url)}
                alt={`Imagem ${index + 1}`}
                width={80}
                height={80}
                className={`h-20 w-20 rounded-lg border-2 object-cover ${
                  index === 0 ? "border-slate-700" : "border-slate-200"
                }`}
                unoptimized
              />
              {index === 0 && (
                <span className="absolute -left-1 -top-1 rounded-full bg-slate-800 px-1.5 py-0.5 text-[9px] font-bold leading-none text-white">
                  Capa
                </span>
              )}
              {/* Botão remover */}
              <button
                type="button"
                onClick={() => remove(index)}
                className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white group-hover:flex"
              >
                ×
              </button>
              {/* Definir como capa */}
              {index > 0 && (
                <button
                  type="button"
                  onClick={() => setAsCover(index)}
                  title="Definir como capa"
                  className="absolute bottom-0 left-0 right-0 hidden rounded-b-lg bg-slate-800/80 py-0.5 text-center text-[9px] text-white group-hover:block"
                >
                  ★ Capa
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <label
        className={`flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed px-4 py-3 text-sm transition ${
          uploading
            ? "cursor-not-allowed border-slate-200 text-slate-400"
            : "border-slate-300 text-slate-600 hover:border-slate-500 hover:bg-slate-50"
        }`}
      >
        <svg
          width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="shrink-0"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
        {uploading ? "Enviando…" : images.length === 0 ? "Adicionar imagens" : "Adicionar mais imagens"}
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={uploading}
          onChange={handleFiles}
          className="sr-only"
        />
      </label>

      {uploadError && (
        <p className="text-xs font-medium text-red-600">{uploadError}</p>
      )}
      <p className="text-xs text-slate-400">JPG, PNG, WebP ou GIF · máx. 8 MB por imagem. A primeira imagem será a capa.</p>
    </div>
  );
}

export function ProductForm({
  initialProduct,
  categories,
  isSubmitting,
  onSubmit,
  onCancelEdit,
}: ProductFormProps) {
  const [formState, setFormState] = useState<ProductFormState>(() => getInitialState(initialProduct));
  const [discountPercent, setDiscountPercent] = useState(() => initialProduct?.discountPercent ?? 0);

  const parsedPrice = Number(formState.price);
  const discountedPrice = Number((parsedPrice * (1 - discountPercent / 100)).toFixed(2));
  const isPriceValid = formState.price.trim().length > 0 && !Number.isNaN(parsedPrice) && parsedPrice > 0;
  const isFormValid =
    formState.name.trim().length > 0 &&
    formState.categoryId.trim().length > 0 &&
    isPriceValid;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isFormValid) {
      return;
    }

    const payload: ProductPayload = {
      name: formState.name.trim(),
      description: formState.description.trim() || undefined,
      price: discountedPrice,
      imageUrl: formState.allImages[0] || undefined,
      imageGallery: formState.allImages.slice(1).join("\n") || undefined,
      variations: undefined,
      badgeNew: formState.badgeNew,
      badgePromo: formState.badgePromo,
      badgeBestSeller: formState.badgeBestSeller,
      discountPercent: discountPercent,
      categoryId: formState.categoryId,
    };

    await onSubmit(payload);

    if (!initialProduct) {
      setFormState(getInitialState(null));
    }
  }

  const isEditing = Boolean(initialProduct);

  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <h3 className="text-lg font-semibold text-slate-900">
        {isEditing ? "Edit product" : "Create product"}
      </h3>

      {categories.length === 0 && (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Create at least one category before registering products.
        </p>
      )}

      <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={handleSubmit}>
        <label htmlFor="product-name" className="flex flex-col gap-1 text-sm text-slate-700 md:col-span-2">
          Name
          <input
            id="product-name"
            value={formState.name}
            onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
            className="rounded-md border border-slate-300 bg-white px-3 py-2"
            required
          />
        </label>

        <label htmlFor="product-description" className="flex flex-col gap-1 text-sm text-slate-700 md:col-span-2">
          Description
          <textarea
            id="product-description"
            value={formState.description}
            onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
            className="min-h-20 rounded-md border border-slate-300 bg-white px-3 py-2"
          />
        </label>

        <label htmlFor="product-price" className="flex flex-col gap-1 text-sm text-slate-700">
          Price (base)
          <div className="relative">
            <input
              id="product-price"
              type="number"
              step="0.01"
              min="0.01"
              value={formState.price}
              onChange={(event) => setFormState((prev) => ({ ...prev, price: event.target.value }))}
              placeholder="0,00"
              className="w-full rounded-md border border-slate-300 bg-white py-2 pl-10 pr-3"
              required
            />
            <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-sm font-semibold text-slate-500">
              R$
            </span>
          </div>
        </label>

        <label htmlFor="product-discount" className="flex flex-col gap-1 text-sm text-slate-700">
          Desconto
          <select
            id="product-discount"
            value={discountPercent}
            onChange={(event) => setDiscountPercent(Number(event.target.value))}
            className="rounded-md border border-slate-300 bg-white px-3 py-2"
          >
            {DISCOUNT_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value}%
              </option>
            ))}
          </select>
          <span className="text-xs text-slate-500">
            Preço final aplicado: {isPriceValid
              ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(discountedPrice)
              : "-"}
          </span>
        </label>

        <label htmlFor="product-category" className="flex flex-col gap-1 text-sm text-slate-700">
          Category
          <select
            id="product-category"
            value={formState.categoryId}
            onChange={(event) => setFormState((prev) => ({ ...prev, categoryId: event.target.value }))}
            className="rounded-md border border-slate-300 bg-white px-3 py-2"
            disabled={categories.length === 0}
            required
          >
            <option value="">Select a category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <div className="md:col-span-2 flex flex-col gap-1 text-sm text-slate-700">
          Imagens do produto
          <ImageUploadField
            images={formState.allImages}
            onChange={(next) => setFormState((prev) => ({ ...prev, allImages: next }))}
          />
        </div>

        <div className="md:col-span-2 grid gap-2 sm:grid-cols-3">
          <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={formState.badgeNew}
              onChange={(event) => setFormState((prev) => ({ ...prev, badgeNew: event.target.checked }))}
              className="h-4 w-4 rounded border-slate-300"
            />
            Badge: Novo
          </label>
          <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={formState.badgePromo}
              onChange={(event) => setFormState((prev) => ({ ...prev, badgePromo: event.target.checked }))}
              className="h-4 w-4 rounded border-slate-300"
            />
            Badge: Promoção
          </label>
          <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={formState.badgeBestSeller}
              onChange={(event) => setFormState((prev) => ({ ...prev, badgeBestSeller: event.target.checked }))}
              className="h-4 w-4 rounded border-slate-300"
            />
            Badge: Mais vendido
          </label>
        </div>



        <div className="md:col-span-2 flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={isSubmitting || categories.length === 0 || !isFormValid}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
          >
            {isSubmitting ? "Saving..." : isEditing ? "Update product" : "Create product"}
          </button>

          {isEditing && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100"
            >
              Cancel edit
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
