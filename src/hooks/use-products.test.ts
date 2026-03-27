import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useProducts } from "@/hooks/use-products";
import { productService } from "@/services/product-service";
import type { Product } from "@/types";

vi.mock("@/services/product-service", () => ({
  productService: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    setVisibility: vi.fn(),
  },
}));

describe("useProducts", () => {
  it("should update product visibility locally without reloading full list", async () => {
    const baseProducts: Product[] = [
      {
        id: "product-1",
        name: "Keyboard",
        description: "Mechanical",
        price: 300,
        stock: 10,
        imageUrl: undefined,
        active: true,
        categoryId: "cat-1",
        categoryName: "Peripherals",
        createdAt: "2026-03-19T00:00:00",
      },
    ];

    const updatedProduct: Product = {
      ...baseProducts[0],
      active: false,
    };

    vi.mocked(productService.list).mockResolvedValue(baseProducts);
    vi.mocked(productService.setVisibility).mockResolvedValue(updatedProduct);

    const { result } = renderHook(() => useProducts());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.items[0].active).toBe(true);
    expect(productService.list).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.toggleProductVisibility("product-1", false);
    });

    expect(productService.setVisibility).toHaveBeenCalledWith("product-1", false);
    expect(result.current.items[0].active).toBe(false);
    expect(productService.list).toHaveBeenCalledTimes(1);
  });
});
