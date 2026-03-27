import { api } from "@/lib/api";
import type { Product, ProductPayload } from "@/types";

export const productService = {
  list(): Promise<Product[]> {
    return api.get<Product[]>("/api/products");
  },

  create(payload: ProductPayload): Promise<Product> {
    return api.post<Product, ProductPayload>("/api/products", payload);
  },

  update(id: string, payload: ProductPayload): Promise<Product> {
    return api.put<Product, ProductPayload>(`/api/products/${id}`, payload);
  },

  setVisibility(id: string, active: boolean): Promise<Product> {
    return api.patch<Product, { active: boolean }>(`/api/products/${id}/visibility`, { active });
  },

  remove(id: string): Promise<void> {
    return api.delete(`/api/products/${id}`);
  },
};
