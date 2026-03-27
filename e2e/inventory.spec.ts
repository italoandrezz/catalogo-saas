import { test, expect } from "@playwright/test";
import { filterBySearch } from "./utils/ui-helpers";

test.describe("Inventário", () => {
  const PRODUCT_NAME = `Produto Inventário E2E ${Date.now()}`;
  const CATEGORY_NAME = `Cat Inventário ${Date.now()}`;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: "e2e/.auth/session.json" });
    const page = await context.newPage();
    await page.goto("/categories");
    await page.waitForLoadState("networkidle");

    const nameInput = page.locator('input[required]').first();
    await nameInput.fill(CATEGORY_NAME);
    await page.getByRole("button", { name: "Create category" }).click();

    const csrfError = page.getByText("Request failed with status 403");
    const hasCsrfError = await csrfError.isVisible({ timeout: 1500 }).catch(() => false);
    if (hasCsrfError) {
      await page.getByRole("button", { name: "Create category" }).click();
    }

    await filterBySearch(page, CATEGORY_NAME);

    await expect(page.getByText(CATEGORY_NAME)).toBeVisible({ timeout: 8000 });

    // Criar produto para testes de inventário
    await page.goto("/products");
    await page.waitForLoadState("networkidle");
    await page.fill("#product-name", PRODUCT_NAME);
    await page.fill("#product-price", "50.00");
    await page.selectOption("#product-category", { label: CATEGORY_NAME });
    await page.getByRole("button", { name: "Create product" }).click();

    await filterBySearch(page, PRODUCT_NAME);

    await expect(page.getByText(PRODUCT_NAME)).toBeVisible({ timeout: 10000 });
    await page.close();
    await context.close();
  });

  test("página de estoque abre sem erros", async ({ page }) => {
    await page.goto("/inventory");
    await page.waitForLoadState("networkidle");

    await expect(page.locator('p[role="alert"]')).toHaveCount(0);
    await expect(page.getByText("Gerenciamento de Estoque")).toBeVisible();
  });

  test("busca por produto funciona", async ({ page }) => {
    await page.goto("/inventory");
    await page.waitForLoadState("networkidle");

    const searchInput = page.locator('input[placeholder*="Buscar"]');
    await searchInput.fill(PRODUCT_NAME);
    await page.waitForLoadState("networkidle");

    const productCard = page.locator("button", { hasText: PRODUCT_NAME });
    await expect(productCard).toBeVisible({ timeout: 8000 });
  });

  test("adicionar estoque abre modal e atualiza quantidade", async ({ page }) => {
    await page.goto("/inventory");
    await page.waitForLoadState("networkidle");

    await filterBySearch(page, PRODUCT_NAME, "Buscar produto");

    const productCard = page.locator("button", { hasText: PRODUCT_NAME }).first();
    await productCard.click();

    const modal = page.locator("div").filter({ has: page.getByText(PRODUCT_NAME) }).first();
    await expect(modal).toBeVisible({ timeout: 5000 });

    const addInput = modal.locator('input[placeholder*="Quantidade"]').first();
    await addInput.fill("10");

    const confirmBtn = modal.getByRole("button", { name: "Confirmar" }).first();
    await confirmBtn.click();

    await expect(modal.getByText(/Adicionado.*10/)).toBeVisible({ timeout: 5000 });
  });

  test("ajustar estoque define valor exato", async ({ page }) => {
    await page.goto("/inventory");
    await page.waitForLoadState("networkidle");

    await filterBySearch(page, PRODUCT_NAME, "Buscar produto");

    const productCard = page.locator("button", { hasText: PRODUCT_NAME }).first();
    await productCard.click();

    const modal = page.locator("div").filter({ has: page.getByText(PRODUCT_NAME) }).first();
    await expect(modal).toBeVisible({ timeout: 5000 });

    const adjustTab = modal.getByRole("button", { name: "Ajustar" }).first();
    await adjustTab.click();

    const adjustInput = modal.locator('input[placeholder*="Novo valor"]');
    await adjustInput.fill("5");

    const adjustBtn = modal.getByRole("button", { name: "Ajustar" }).nth(1);
    await adjustBtn.click();

    await expect(modal.getByText(/Estoque ajustado/)).toBeVisible({ timeout: 5000 });
  });

  test("registrar venda deduz estoque", async ({ page }) => {
    await page.goto("/inventory");
    await page.waitForLoadState("networkidle");

    await filterBySearch(page, PRODUCT_NAME, "Buscar produto");

    const productCard = page.locator("button", { hasText: PRODUCT_NAME }).first();
    await productCard.click();

    const modal = page.locator("div").filter({ has: page.getByText(PRODUCT_NAME) }).first();
    await expect(modal).toBeVisible({ timeout: 5000 });

    const stockInfo = await modal.getByText(/Estoque atual:/).textContent();
    const currentStock = Number(stockInfo?.match(/(\d+)\s*unid\./)?.[1] ?? "0");
    if (currentStock < 2) {
      await modal.getByRole("button", { name: "Adicionar" }).click();
      const addInput = modal.locator('input[placeholder*="Quantidade a adicionar"]');
      await addInput.fill("3");
      await modal.getByRole("button", { name: "Confirmar" }).click();
      await expect(modal.getByText(/Adicionado/)).toBeVisible({ timeout: 5000 });
    }

    const saleTab = modal.getByRole("button", { name: "Venda" });
    await saleTab.click();

    const saleQtyInput = modal.locator('input[type="number"]');
    await saleQtyInput.fill("2");

    const nameInput = modal.locator('input[placeholder*="cliente"]');
    await nameInput.fill("Cliente Teste");

    const phoneInput = modal.locator('input[placeholder*="00"]');
    await phoneInput.fill("11912345678");

    const recordBtn = modal.getByRole("button", { name: "Confirmar Venda" });
    await recordBtn.click();

    await expect(modal.getByText(/Venda registrada/)).toBeVisible({ timeout: 5000 });
  });

  test("histórico de operações exibe dashboard e tabela", async ({ page }) => {
    await page.goto("/inventory/history");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Historico de Operacoes")).toBeVisible();

    // Verifica cards do dashboard
    await expect(page.getByText("Vendas registradas")).toBeVisible();
    await expect(page.getByText("Unidades vendidas")).toBeVisible();
    await expect(page.getByText("Entradas de estoque")).toBeVisible();
    await expect(page.getByText("Ajustes realizados")).toBeVisible();

    // Verifica filtros
    const filterButtons = page.getByRole("button", { name: /Todos|Entradas|Ajustes|Vendas/ });
    await expect(filterButtons).toHaveCount(4);
  });

  test("filtro de histórico por tipo funciona", async ({ page }) => {
    await page.goto("/inventory/history");
    await page.waitForLoadState("networkidle");

    const vendas = page.getByRole("button", { name: "Vendas" });
    await vendas.click();
    await page.waitForLoadState("networkidle");

    // Pode haver tabela ou estado vazio, dependendo das operações no localStorage do contexto atual.
    const table = page.locator("table");
    const emptyState = page.getByText("Nenhuma operacao encontrada.");
    await expect(table.or(emptyState)).toBeVisible({ timeout: 5000 });
  });
});
