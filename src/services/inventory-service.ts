import { api } from "@/lib/api";
import type { InventoryOperation, Product } from "@/types";

export const inventoryService = {
  listOperations(type?: "all" | "add" | "adjust" | "remove"): Promise<InventoryOperation[]> {
    const suffix = type && type !== "all" ? `?type=${type}` : "";
    return api.get<InventoryOperation[]>(`/api/inventory/operations${suffix}`);
  },

  // Adicionar quantidade ao estoque
  async addStock(productId: string, quantity: number): Promise<Product> {
    return api.patch<Product, { quantity: number }>(`/api/products/${productId}/stock/add`, {
      quantity: Math.max(0, quantity),
    });
  },

  // Remover quantidade do estoque (venda)
  async removeStock(productId: string, quantity: number): Promise<Product> {
    return api.patch<Product, { quantity: number }>(`/api/products/${productId}/stock/remove`, {
      quantity: Math.max(0, Math.min(quantity, 9999)),
    });
  },

  // Ajustar estoque para valor exato
  async setStock(productId: string, quantity: number): Promise<Product> {
    return api.patch<Product, { quantity: number }>(`/api/products/${productId}/stock/set`, {
      quantity: Math.max(0, quantity),
    });
  },

  // Registrar uma venda (remove estoque e retorna confirmação)
  async recordSale(productId: string, quantity: number, leadName?: string, leadPhone?: string): Promise<{
    product: Product;
    saleId: string;
    timestamp: string;
  }> {
    return api.post(`/api/products/${productId}/sales`, {
      quantity: Math.max(1, Math.min(quantity, 9999)),
      leadName: leadName || undefined,
      leadPhone: leadPhone || undefined,
    });
  },
};
