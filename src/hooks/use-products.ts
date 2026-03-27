"use client";

import { useCallback, useEffect, useState } from "react";
import type { Product, ProductPayload } from "@/types";
import { productService } from "@/services/product-service";

export function useProducts() {
  const [items, setItems] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await productService.list();
      setItems(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load products.";
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createProduct = useCallback(async (payload: ProductPayload) => {
    setIsSubmitting(true);
    setActionErrorMessage(null);

    try {
      await productService.create(payload);
      await load();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create product.";
      setActionErrorMessage(message);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [load]);

  const updateProduct = useCallback(async (id: string, payload: ProductPayload) => {
    setIsSubmitting(true);
    setActionErrorMessage(null);

    try {
      await productService.update(id, payload);
      await load();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update product.";
      setActionErrorMessage(message);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [load]);

  const deleteProduct = useCallback(async (id: string) => {
    setDeletingId(id);
    setActionErrorMessage(null);

    try {
      await productService.remove(id);
      await load();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to delete product.";
      setActionErrorMessage(message);
      throw error;
    } finally {
      setDeletingId(null);
    }
  }, [load]);

  const toggleProductVisibility = useCallback(async (id: string, active: boolean) => {
    setTogglingId(id);
    setActionErrorMessage(null);

    try {
      const updatedProduct = await productService.setVisibility(id, active);
      setItems((previous) => previous.map((item) => (item.id === id ? updatedProduct : item)));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update product visibility.";
      setActionErrorMessage(message);
      throw error;
    } finally {
      setTogglingId(null);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    items,
    isLoading,
    isSubmitting,
    deletingId,
    togglingId,
    errorMessage,
    actionErrorMessage,
    createProduct,
    updateProduct,
    deleteProduct,
    toggleProductVisibility,
    refresh: load,
  };
}
