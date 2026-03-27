import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProductForm } from "@/components/forms/product-form";

// Simula o uploadImage para evitar chamadas de rede durante o teste
vi.mock("@/lib/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...original,
    uploadImage: vi.fn().mockResolvedValue("https://img.test/keyboard.png"),
    resolveImageUrl: (url: string) => url,
  };
});

describe("ProductForm", () => {
  it("should submit payload without images when none were uploaded", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <ProductForm
        initialProduct={null}
        categories={[{ id: "cat-1", name: "Keyboards" }]}
        isSubmitting={false}
        onSubmit={onSubmit}
        onCancelEdit={() => undefined}
      />,
    );

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Keyboard" } });
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "Mechanical keyboard" } });
    fireEvent.change(screen.getByRole("spinbutton", { name: /price/i }), { target: { value: "299.9" } });
    fireEvent.change(screen.getByRole("combobox", { name: /category/i }), { target: { value: "cat-1" } });

    fireEvent.click(screen.getByRole("button", { name: "Create product" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      name: "Keyboard",
      description: "Mechanical keyboard",
      price: 299.9,
      imageUrl: undefined,
      imageGallery: undefined,
      variations: undefined,
      badgeNew: false,
      badgePromo: false,
      badgeBestSeller: false,
      discountPercent: 0,
      categoryId: "cat-1",
    });
  });
});

