import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useInventory } from "@/hooks/use-inventory";
import { productService } from "@/services/product-service";
import { inventoryService } from "@/services/inventory-service";
import type { Product } from "@/types";

vi.mock("@/services/product-service", () => ({
  productService: {
    list: vi.fn(),
  },
}));

vi.mock("@/services/inventory-service", () => ({
  inventoryService: {
    listOperations: vi.fn(),
    addStock: vi.fn(),
    removeStock: vi.fn(),
    setStock: vi.fn(),
    recordSale: vi.fn(),
  },
}));

describe("useInventory", () => {
  it("should load persisted operations and refresh after addStock", async () => {
    const product: Product = {
      id: "p-1",
      name: "Mouse",
      price: 100,
      stock: 10,
      active: true,
      createdAt: "2026-03-24T00:00:00",
    };

    const updated: Product = { ...product, stock: 15 };

    vi.mocked(productService.list).mockResolvedValue([product]);
    vi.mocked(inventoryService.listOperations)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: "op-1",
          productId: "p-1",
          productName: "Mouse",
          type: "add",
          quantity: 5,
          previousQuantity: 10,
          timestamp: "2026-03-24T10:00:00",
        },
      ]);
    vi.mocked(inventoryService.addStock).mockResolvedValue(updated);

    const { result } = renderHook(() => useInventory());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.products[0].stock).toBe(10);
    expect(result.current.operations).toHaveLength(0);

    await act(async () => {
      await result.current.addStock("p-1", 5);
    });

    expect(inventoryService.addStock).toHaveBeenCalledWith("p-1", 5);
    expect(inventoryService.listOperations).toHaveBeenCalledTimes(2);
    expect(result.current.products[0].stock).toBe(15);
    expect(result.current.operations).toHaveLength(1);
  });
});
