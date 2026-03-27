"use client";

import { useCallback, useEffect, useState } from "react";
import type { Category, CategoryPayload } from "@/types";
import { categoryService } from "@/services/category-service";

export function useCategories() {
  const [items, setItems] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await categoryService.list();
      setItems(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load categories.";
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createCategory = useCallback(async (payload: CategoryPayload) => {
    setIsSubmitting(true);
    setActionErrorMessage(null);

    try {
      await categoryService.create(payload);
      await load();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create category.";
      setActionErrorMessage(message);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [load]);

  const updateCategory = useCallback(async (id: string, payload: CategoryPayload) => {
    setIsSubmitting(true);
    setActionErrorMessage(null);

    try {
      await categoryService.update(id, payload);
      await load();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update category.";
      setActionErrorMessage(message);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [load]);

  const deleteCategory = useCallback(async (id: string) => {
    setDeletingId(id);
    setActionErrorMessage(null);

    try {
      await categoryService.remove(id);
      await load();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to delete category.";
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
    createCategory,
    updateCategory,
    deleteCategory,
    refresh: load,
  };
}
