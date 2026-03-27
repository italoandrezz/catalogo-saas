import { api } from "@/lib/api";
import type { Category, CategoryPayload } from "@/types";

export const categoryService = {
  list(): Promise<Category[]> {
    return api.get<Category[]>("/api/categories");
  },

  create(payload: CategoryPayload): Promise<Category> {
    return api.post<Category, CategoryPayload>("/api/categories", payload);
  },

  update(id: string, payload: CategoryPayload): Promise<Category> {
    return api.put<Category, CategoryPayload>(`/api/categories/${id}`, payload);
  },

  remove(id: string): Promise<void> {
    return api.delete(`/api/categories/${id}`);
  },
};
