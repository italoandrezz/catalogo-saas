import { expect, type Page } from "@playwright/test";

export async function filterBySearch(page: Page, query: string, placeholder = "Buscar") {
  const searchInput = page.locator(`input[placeholder*="${placeholder}"]`).first();
  await expect(searchInput).toBeVisible({ timeout: 8000 });
  await searchInput.fill(query);
  await page.waitForLoadState("networkidle");
}
