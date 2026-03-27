import { describe, expect, it, vi } from "vitest";
import { categoryService } from "@/services/category-service";

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("categoryService", () => {
  const mockCategories = [
    { id: "cat-1", name: "Eletrônicos" },
    { id: "cat-2", name: "Acessórios" },
  ];

  it("should list categories", async () => {
    const { api } = await import("@/lib/api");
    vi.mocked(api.get).mockResolvedValue(mockCategories);

    const result = await categoryService.list();

    expect(api.get).toHaveBeenCalledWith("/api/categories");
    expect(result).toEqual(mockCategories);
  });

  it("should create category", async () => {
    const { api } = await import("@/lib/api");
    const newCat = { id: "cat-3", name: "Periféricos" };
    vi.mocked(api.post).mockResolvedValue(newCat);

    const result = await categoryService.create({ name: "Periféricos" });

    expect(api.post).toHaveBeenCalledWith("/api/categories", { name: "Periféricos" });
    expect(result).toEqual(newCat);
  });
});
