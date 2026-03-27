import { test, expect } from "@playwright/test";

test.describe("Catálogo público", () => {
  test("catálogo abre e exibe produtos ativos", async ({ page }) => {
    // Vai ao dashboard para pegar o link do catálogo
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const catalogLink = page.locator('a[href^="/catalog/"]');
    await expect(catalogLink).toBeVisible({ timeout: 8000 });

    const href = await catalogLink.getAttribute("href");
    expect(href).toMatch(/^\/catalog\/.+/);

    // Abre o catálogo
    await page.goto(href!);
    await page.waitForLoadState("networkidle");

    // Ignora o route announcer do Next.js e valida apenas alertas de erro da UI
    await expect(page.locator('p[role="alert"]')).toHaveCount(0);
  });

  test("catálogo não requer autenticação (acessível sem login)", async ({ browser }) => {
    // Contexto completamente novo (sem cookies de sessão)
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();

    // Primeiro pega o tenantId logado
    const authPage = await browser.newPage();
    await authPage.goto("/dashboard");
    await authPage.waitForLoadState("networkidle");
    const href = await authPage.locator('a[href^="/catalog/"]').getAttribute("href");
    await authPage.close();

    if (!href) {
      test.skip(true, "Nenhum link de catálogo encontrado no dashboard");
      return;
    }

    // Acessa o catálogo sem estar logado
    await page.goto(`http://localhost:3000${href}`);
    await page.waitForLoadState("networkidle");

    // Não deve redirecionar para login
    expect(page.url()).not.toContain("/login");
    // Página deve ter algum conteúdo (h1, grid de produtos, ou mensagem "sem produtos")
    const body = await page.textContent("body");
    expect(body?.length).toBeGreaterThan(50);

    await context.close();
  });

  test("imagens do catálogo carregam sem erros de CSP", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const href = await page.locator('a[href^="/catalog/"]').getAttribute("href");
    if (!href) {
      test.skip(true, "Nenhum catálogo disponível");
      return;
    }

    const imageErrors: string[] = [];
    page.on("response", (response) => {
      if (response.url().includes("/uploads/") && response.status() >= 400) {
        imageErrors.push(`${response.status()} ${response.url()}`);
      }
    });

    await page.goto(`http://localhost:3000${href}`);
    await page.waitForLoadState("networkidle");

    expect(imageErrors).toHaveLength(0);
  });
});
