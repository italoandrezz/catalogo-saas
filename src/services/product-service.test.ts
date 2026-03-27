import { describe, expect, it, vi } from "vitest";
import { productService } from "@/services/product-service";

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("productService", () => {
  const mockProduct = {
    id: "p-1",
    name: "Mouse Gamer",
    price: 150,
    stock: 10,
    active: true,
  };

  it("should list products", async () => {
    const { api } = await import("@/lib/api");
    vi.mocked(api.get).mockResolvedValue([mockProduct]);

    const result = await productService.list();

    expect(api.get).toHaveBeenCalledWith("/api/products");
    expect(result).toContainEqual(mockProduct);
  });

  it("should create product", async () => {
    const { api } = await import("@/lib/api");
    vi.mocked(api.post).mockResolvedValue(mockProduct);

    const result = await productService.create({
      name: "Mouse Gamer",
      price: 150,
      categoryId: "cat-1",
    });

    expect(api.post).toHaveBeenCalledWith("/api/products", expect.any(Object));
    expect(result).toEqual(mockProduct);
  });

  it("should delete product", async () => {
    const { api } = await import("@/lib/api");
    vi.mocked(api.delete).mockResolvedValue(undefined);

    await productService.remove("p-1");

    expect(api.delete).toHaveBeenCalledWith("/api/products/p-1");
  });
});
