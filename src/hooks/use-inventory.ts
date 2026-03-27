import { useCallback, useEffect, useState } from "react";
import type { InventoryOperation, Product } from "@/types";
import { productService } from "@/services/product-service";
import { inventoryService } from "@/services/inventory-service";

export function useInventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);
  const [operations, setOperations] = useState<InventoryOperation[]>([]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [productData, operationsData] = await Promise.all([
        productService.list(),
        inventoryService.listOperations(),
      ]);
      setProducts(productData);
      setOperations(operationsData);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Erro ao carregar produtos.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addStock = useCallback(
    async (productId: string, quantity: number) => {
      setActionErrorMessage(null);
      try {
        const product = products.find((p) => p.id === productId);
        if (!product) throw new Error("Produto não encontrado.");

        const updated = await inventoryService.addStock(productId, quantity);
        setProducts((prev) => prev.map((p) => (p.id === productId ? updated : p)));
        const operationsData = await inventoryService.listOperations();
        setOperations(operationsData);

        return updated;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Erro ao adicionar estoque.";
        setActionErrorMessage(message);
        throw err;
      }
    },
    [products],
  );

  const recordSale = useCallback(
    async (productId: string, quantity: number, leadName?: string, leadPhone?: string) => {
      setActionErrorMessage(null);
      try {
        const product = products.find((p) => p.id === productId);
        if (!product) throw new Error("Produto não encontrado.");
        if (product.stock < quantity) throw new Error("Estoque insuficiente para esta quantidade.");

        const result = await inventoryService.recordSale(productId, quantity, leadName, leadPhone);
        setProducts((prev) => prev.map((p) => (p.id === productId ? result.product : p)));
        const operationsData = await inventoryService.listOperations();
        setOperations(operationsData);

        return result;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Erro ao registrar venda.";
        setActionErrorMessage(message);
        throw err;
      }
    },
    [products],
  );

  const adjustStock = useCallback(
    async (productId: string, newQuantity: number) => {
      setActionErrorMessage(null);
      try {
        const product = products.find((p) => p.id === productId);
        if (!product) throw new Error("Produto não encontrado.");

        const updated = await inventoryService.setStock(productId, newQuantity);
        setProducts((prev) => prev.map((p) => (p.id === productId ? updated : p)));
        const operationsData = await inventoryService.listOperations();
        setOperations(operationsData);

        return updated;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Erro ao ajustar estoque.";
        setActionErrorMessage(message);
        throw err;
      }
    },
    [products],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    products,
    isLoading,
    errorMessage,
    actionErrorMessage,
    operations,
    refresh,
    addStock,
    adjustStock,
    recordSale,
  };
}
