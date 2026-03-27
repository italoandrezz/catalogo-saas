import { describe, expect, it, vi } from "vitest";
import { customerService } from "@/services/customer-service";

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("customerService", () => {
  const mockCustomers = [
    { id: "c-1", name: "João", email: "joao@x.com", phone: "11900000000" },
    { id: "c-2", name: "Maria", email: "maria@x.com", phone: "11911111111" },
  ];

  it("should list customers", async () => {
    const { api } = await import("@/lib/api");
    vi.mocked(api.get).mockResolvedValue(mockCustomers);

    const result = await customerService.list();

    expect(api.get).toHaveBeenCalledWith("/api/customers");
    expect(result).toEqual(mockCustomers);
  });

  it("should remove customer", async () => {
    const { api } = await import("@/lib/api");
    vi.mocked(api.delete).mockResolvedValue(undefined);

    await customerService.remove("c-1");

    expect(api.delete).toHaveBeenCalledWith("/api/customers/c-1");
  });
});
