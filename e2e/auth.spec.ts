import { test, expect } from "@playwright/test";

const E2E_EMAIL = process.env.E2E_EMAIL ?? "";
const E2E_PASSWORD = process.env.E2E_PASSWORD ?? "";

// Testes sem sessão salva — precisam de projeto sem storageState
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Autenticação", () => {
  test("login com credenciais corretas redireciona para produtos", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("Boas-vindas de volta")).toBeVisible();

    await page.fill("#email", E2E_EMAIL);
    await page.fill("#password", E2E_PASSWORD);
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/products|\/dashboard/, { timeout: 10000 });
    expect(page.url()).toMatch(/\/(products|dashboard)/);
  });

  test("login com senha errada exibe mensagem de erro", async ({ page }) => {
    await page.goto("/login");

    await page.fill("#email", E2E_EMAIL);
    await page.fill("#password", "senha-errada-123");
    await page.click('button[type="submit"]');

    const alert = page.locator('p[role="alert"]');
    await expect(alert).toBeVisible({ timeout: 8000 });
    // Evita conflito com o route announcer do Next.js
    await expect(alert).toContainText(/invalid|inválid|credenciais|credentials/i);
  });

  test("acessar /products sem login redireciona para /login", async ({ page }) => {
    await page.goto("/products");
    await page.waitForURL(/\/login/, { timeout: 8000 });
    expect(page.url()).toContain("/login");
  });

  test("logout redireciona para a página de login", async ({ page }) => {
    // Faz login primeiro
    await page.goto("/login");
    await page.fill("#email", E2E_EMAIL);
    await page.fill("#password", E2E_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/products|\/dashboard/, { timeout: 10000 });

    // Clica em Logout no menu
    await page.getByRole("button", { name: "Logout" }).click();
    await page.waitForURL(/\/login/, { timeout: 8000 });
    expect(page.url()).toContain("/login");
  });
});
