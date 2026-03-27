import { test as setup, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const E2E_EMAIL = process.env.E2E_EMAIL ?? "";
const E2E_PASSWORD = process.env.E2E_PASSWORD ?? "";
const SESSION_PATH = "e2e/.auth/session.json";

setup("autenticar e salvar sessão", async ({ page }) => {
  if (!E2E_EMAIL || !E2E_PASSWORD) {
    throw new Error(
      "Defina as variáveis de ambiente E2E_EMAIL e E2E_PASSWORD antes de rodar os testes.\n" +
        'Exemplo (PowerShell): $env:E2E_EMAIL="seu@email.com"; $env:E2E_PASSWORD="suasenha"'
    );
  }

  await page.goto("/login");
  await expect(page.getByText("Boas-vindas de volta")).toBeVisible();

  await page.fill("#email", E2E_EMAIL);
  await page.fill("#password", E2E_PASSWORD);
  await page.click('button[type="submit"]');

  // Aguarda redirecionamento após login bem-sucedido
  await page.waitForURL(/\/products|\/dashboard/, { timeout: 10000 });

  // Garante que o diretório existe antes de salvar
  const dir = path.dirname(SESSION_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  await page.context().storageState({ path: SESSION_PATH });
});
