import { api } from "@/lib/api";
import type { Customer, CustomerPayload } from "@/types";

export const customerService = {
  list(): Promise<Customer[]> {
    return api.get<Customer[]>("/api/customers");
  },

  create(payload: CustomerPayload): Promise<Customer> {
    return api.post<Customer, CustomerPayload>("/api/customers", payload);
  },

  update(id: string, payload: CustomerPayload): Promise<Customer> {
    return api.put<Customer, CustomerPayload>(`/api/customers/${id}`, payload);
  },

  remove(id: string): Promise<void> {
    return api.delete(`/api/customers/${id}`);
  },
};
