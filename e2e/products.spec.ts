import { test, expect } from "@playwright/test";
import { filterBySearch } from "./utils/ui-helpers";

// Usa a sessão salva pelo auth.setup.ts
test.describe("Produtos", () => {
  const PRODUCT_NAME = `Produto E2E ${Date.now()}`;
  const CATEGORY_NAME = `Cat E2E ${Date.now()}`;

  // Cria uma categoria antes dos testes de produto (produto requer categoria)
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: "e2e/.auth/session.json" });
    const page = await context.newPage();
    await page.goto("/categories");
    await page.waitForLoadState("networkidle");

    const nameInput = page.locator('input[required]').first();
    await nameInput.fill(CATEGORY_NAME);
    await page.getByRole("button", { name: "Create category" }).click();

    // Em alguns cenários o primeiro POST pode falhar por CSRF ainda não materializado em cookie.
    const csrfError = page.getByText("Request failed with status 403");
    const hasCsrfError = await csrfError.isVisible({ timeout: 1500 }).catch(() => false);
    if (hasCsrfError) {
      await page.getByRole("button", { name: "Create category" }).click();
    }

    await filterBySearch(page, CATEGORY_NAME);

    // Aguarda aparecer na lista
    await expect(page.getByText(CATEGORY_NAME)).toBeVisible({ timeout: 8000 });
    await page.close();
    await context.close();
  });

  test("listagem de produtos carrega sem erro", async ({ page }) => {
    await page.goto("/products");
    await page.waitForLoadState("networkidle");

    // Ignora o route announcer do Next.js e valida apenas alertas de erro da UI
    await expect(page.locator('p[role="alert"]')).toHaveCount(0);
    // Título da tabela deve estar visível
    await expect(page.getByText("Produtos")).toBeVisible();
  });

  test("imagens de produtos carregam (sem erro 404 de CSP)", async ({ page }) => {
    const imageErrors: string[] = [];

    page.on("response", (response) => {
      if (response.url().includes("/uploads/") && response.status() >= 400) {
        imageErrors.push(response.url());
      }
    });

    await page.goto("/products");
    await page.waitForLoadState("networkidle");

    expect(imageErrors).toHaveLength(0);
  });

  test("criar produto novo aparece na lista", async ({ page }) => {
    await page.goto("/products");
    await page.waitForLoadState("networkidle");

    // Preenche o formulário de produto
    await page.fill("#product-name", PRODUCT_NAME);
    await page.fill("#product-price", "99.90");

    // Seleciona a categoria criada no beforeAll
    await page.selectOption("#product-category", { label: CATEGORY_NAME });

    await page.getByRole("button", { name: "Create product" }).click();

    await filterBySearch(page, PRODUCT_NAME);

    // O produto deve aparecer na tabela
    await expect(page.getByText(PRODUCT_NAME)).toBeVisible({ timeout: 10000 });
  });

  test("editar produto atualiza os dados na lista", async ({ page }) => {
    await page.goto("/products");
    await page.waitForLoadState("networkidle");

    await filterBySearch(page, PRODUCT_NAME);

    // Abre o menu Ações do produto criado
    const row = page.locator("tr", { hasText: PRODUCT_NAME });
    await expect(row).toBeVisible({ timeout: 8000 });

    await row.locator("summary").click();
    await row.getByRole("button", { name: "Editar" }).click();

    const updatedName = `${PRODUCT_NAME} (editado)`;
    await page.fill("#product-name", updatedName);
    await page.getByRole("button", { name: "Update product" }).click();

    await filterBySearch(page, updatedName);

    await expect(page.getByText(updatedName)).toBeVisible({ timeout: 10000 });
  });

  test("toggle ativo/inativo funciona", async ({ page }) => {
    await page.goto("/products");
    await page.waitForLoadState("networkidle");

    const updatedName = `${PRODUCT_NAME} (editado)`;
    await filterBySearch(page, updatedName);

    const row = page.locator("tr", { hasText: updatedName });
    await expect(row).toBeVisible({ timeout: 8000 });

    const toggle = row.locator('button[title="Desativar"], button[title="Ativar"]');
    const titleBefore = await toggle.getAttribute("title");
    await toggle.click();

    // Aguarda o toggle mudar de estado
    const expected = titleBefore === "Desativar" ? "Ativar" : "Desativar";
    await expect(row.locator(`button[title="${expected}"]`)).toBeVisible({ timeout: 8000 });
  });

  test("excluir produto remove da lista", async ({ page }) => {
    await page.goto("/products");
    await page.waitForLoadState("networkidle");

    const updatedName = `${PRODUCT_NAME} (editado)`;
    await filterBySearch(page, updatedName);

    const row = page.locator("tr", { hasText: updatedName });
    await expect(row).toBeVisible({ timeout: 8000 });

    await row.locator("summary").click();
    await row.getByRole("button", { name: "Excluir" }).click();

    // Modal de confirmação (aceita PT/EN)
    const confirmDelete = page.getByRole("button", { name: /Excluir permanentemente|Delete permanently/i });
    await confirmDelete.click();

    await expect(page.getByText(updatedName)).toHaveCount(0, { timeout: 10000 });
  });
});
