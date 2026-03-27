"use client";

import { useCallback, useEffect, useState } from "react";
import type { Customer, CustomerPayload } from "@/types";
import { customerService } from "@/services/customer-service";

export function useCustomers() {
  const [items, setItems] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await customerService.list();
      setItems(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load customers.";
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createCustomer = useCallback(async (payload: CustomerPayload) => {
    setIsSubmitting(true);
    setActionErrorMessage(null);

    try {
      await customerService.create(payload);
      await load();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create customer.";
      setActionErrorMessage(message);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [load]);

  const updateCustomer = useCallback(async (id: string, payload: CustomerPayload) => {
    setIsSubmitting(true);
    setActionErrorMessage(null);

    try {
      await customerService.update(id, payload);
      await load();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update customer.";
      setActionErrorMessage(message);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [load]);

  const deleteCustomer = useCallback(async (id: string) => {
    setDeletingId(id);
    setActionErrorMessage(null);

    try {
      await customerService.remove(id);
      await load();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to delete customer.";
      setActionErrorMessage(message);
      throw error;
    } finally {
      setDeletingId(null);
    }
  }, [load]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    items,
    isLoading,
    isSubmitting,
    deletingId,
    errorMessage,
    actionErrorMessage,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    refresh: load,
  };
}
