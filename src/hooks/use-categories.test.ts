import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useCategories } from "@/hooks/use-categories";
import { categoryService } from "@/services/category-service";

vi.mock("@/services/category-service", () => ({
  categoryService: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

describe("useCategories", () => {
  it("should create category and refresh list", async () => {
    vi.mocked(categoryService.list)
      .mockResolvedValueOnce([{ id: "cat-1", name: "Acessorios" }])
      .mockResolvedValueOnce([
        { id: "cat-1", name: "Acessorios" },
        { id: "cat-2", name: "Teclados" },
      ]);
    vi.mocked(categoryService.create).mockResolvedValue({ id: "cat-2", name: "Teclados" });

    const { result } = renderHook(() => useCategories());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.items).toHaveLength(1);

    await act(async () => {
      await result.current.createCategory({ name: "Teclados" });
    });

    expect(categoryService.create).toHaveBeenCalledWith({ name: "Teclados" });
    expect(categoryService.list).toHaveBeenCalledTimes(2);
    expect(result.current.items).toHaveLength(2);
  });
});
