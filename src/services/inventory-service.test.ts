import { describe, expect, it, vi } from "vitest";
import { inventoryService } from "@/services/inventory-service";

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

describe("inventoryService", () => {
  const mockOperations = [
    {
      id: "op-1",
      productId: "p-1",
      productName: "Mouse",
      type: "add" as const,
      quantity: 5,
      previousQuantity: 10,
      timestamp: "2026-03-24T10:00:00",
    },
  ];

  const mockProduct = { id: "p-1", name: "Mouse", stock: 15 };

  it("should list operations with optional type filter", async () => {
    const { api } = await import("@/lib/api");
    vi.mocked(api.get).mockResolvedValue(mockOperations);

    const response = await inventoryService.listOperations("add");

    expect(api.get).toHaveBeenCalledWith("/api/inventory/operations?type=add");
    expect(response).toEqual(mockOperations);
  });

  it("should add stock to product", async () => {
    const { api } = await import("@/lib/api");
    vi.mocked(api.patch).mockResolvedValue(mockProduct);

    const response = await inventoryService.addStock("p-1", 5);

    expect(api.patch).toHaveBeenCalledWith("/api/products/p-1/stock/add", { quantity: 5 });
    expect(response).toEqual(mockProduct);
  });

  it("should record sale", async () => {
    const { api } = await import("@/lib/api");
    vi.mocked(api.post).mockResolvedValue({ product: mockProduct, saleId: "sale-1", timestamp: "2026-03-24T10:00:00" });

    const response = await inventoryService.recordSale("p-1", 1, "Customer", "11900000000");

    expect(api.post).toHaveBeenCalledWith("/api/products/p-1/sales", expect.any(Object));
    expect(response).toBeDefined();
  });
});
