import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useCustomers } from "@/hooks/use-customers";
import { customerService } from "@/services/customer-service";

vi.mock("@/services/customer-service", () => ({
  customerService: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

describe("useCustomers", () => {
  it("should delete customer and refresh list", async () => {
    vi.mocked(customerService.list)
      .mockResolvedValueOnce([
        { id: "c-1", name: "Maria", email: "maria@x.com", phone: "11900000000" },
        { id: "c-2", name: "Joao", email: "joao@x.com", phone: "11911111111" },
      ])
      .mockResolvedValueOnce([
        { id: "c-2", name: "Joao", email: "joao@x.com", phone: "11911111111" },
      ]);

    vi.mocked(customerService.remove).mockResolvedValue(undefined);

    const { result } = renderHook(() => useCustomers());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.items).toHaveLength(2);

    await act(async () => {
      await result.current.deleteCustomer("c-1");
    });

    expect(customerService.remove).toHaveBeenCalledWith("c-1");
    expect(customerService.list).toHaveBeenCalledTimes(2);
    expect(result.current.items).toHaveLength(1);
  });
});
