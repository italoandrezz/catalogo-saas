import { test, expect } from "@playwright/test";
import { filterBySearch } from "./utils/ui-helpers";

test.describe("Categorias", () => {
  test("CRUD de categoria funciona", async ({ page }) => {
    const categoryName = `Cat Test ${Date.now()}`;
    const updatedName = `${categoryName} (edit)`;

    await page.goto("/categories");
    await page.waitForLoadState("networkidle");

    const nameInput = page.locator("input[required]").first();
    await nameInput.fill(categoryName);
    await page.getByRole("button", { name: "Create category" }).click();

    // Retry para o caso de primeiro POST retornar 403 de CSRF.
    const csrfError = page.getByText("Request failed with status 403");
    const hasCsrfError = await csrfError.isVisible({ timeout: 1500 }).catch(() => false);
    if (hasCsrfError) {
      await page.getByRole("button", { name: "Create category" }).click();
    }

    await filterBySearch(page, categoryName);

    await expect(page.getByText(categoryName)).toBeVisible({ timeout: 8000 });

    const row = page.locator("tr", { hasText: categoryName });
    await expect(row).toBeVisible({ timeout: 8000 });
    await row.getByRole("button", { name: "Editar" }).click();

    await nameInput.fill(updatedName);
    await page.getByRole("button", { name: "Update category" }).click();

    await filterBySearch(page, updatedName);

    await expect(page.getByText(updatedName)).toBeVisible({ timeout: 8000 });

    const updatedRow = page.locator("tr", { hasText: updatedName });
    await expect(updatedRow).toBeVisible({ timeout: 8000 });
    await updatedRow.getByRole("button", { name: "Excluir" }).click();

    await page.getByRole("button", { name: "Excluir permanentemente" }).click();

    await expect(page.getByText(updatedName)).toHaveCount(0, { timeout: 8000 });
  });
});

test.describe("Clientes", () => {
  test("CRUD de cliente funciona", async ({ page }) => {
    const customerName = `Cliente E2E ${Date.now()}`;
    const customerEmail = `e2e_${Date.now()}@teste.com`;
    const updatedName = `${customerName} (edit)`;

    await page.goto("/customers");
    await page.waitForLoadState("networkidle");

    await page.getByLabel("Name").fill(customerName);
    await page.getByLabel("Email").fill(customerEmail);
    // Preenche apenas dígitos para o formatador gerar máscara válida.
    await page.getByLabel("Phone").fill("11912345678");

    await expect(page.getByRole("button", { name: "Create customer" })).toBeEnabled();
    await page.getByRole("button", { name: "Create customer" }).click();

    await expect(page.getByText(customerName)).toBeVisible({ timeout: 8000 });

    const row = page.locator("tr", { hasText: customerName });
    await expect(row).toBeVisible({ timeout: 8000 });
    await row.getByRole("button", { name: "Editar" }).click();

    await page.getByLabel("Name").fill(updatedName);
    await page.getByRole("button", { name: "Update customer" }).click();

    await expect(page.getByText(updatedName)).toBeVisible({ timeout: 8000 });

    const updatedRow = page.locator("tr", { hasText: updatedName });
    await expect(updatedRow).toBeVisible({ timeout: 8000 });
    await updatedRow.getByRole("button", { name: "Excluir" }).click();

    await page.getByRole("button", { name: "Excluir permanentemente" }).click();

    await expect(page.getByText(updatedName)).toHaveCount(0, { timeout: 8000 });
  });
});
