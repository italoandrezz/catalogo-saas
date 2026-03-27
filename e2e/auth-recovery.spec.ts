import { test, expect } from "@playwright/test";

const E2E_EMAIL = process.env.E2E_EMAIL ?? "";

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Registro e Recuperacao", () => {
  test("registro com codigo invalido exibe erro", async ({ page }) => {
    const random = Date.now();
    await page.goto("/register");

    await page.fill("#companyName", `Empresa E2E ${random}`);
    await page.fill("#userName", `Usuario E2E ${random}`);
    await page.fill("#email", `novo_${random}@teste.com`);
    await page.fill("#verificationCode", "000000");
    await page.fill("#password", "SenhaForte@123");
    await page.fill("#confirmPassword", "SenhaForte@123");

    await page.getByRole("button", { name: "Create account" }).click();

    const alert = page.locator('p[role="alert"]');
    await expect(alert).toBeVisible({ timeout: 10000 });
    await expect(alert).toContainText(/code|codigo|verification|invalid/i);
  });

  test("esqueci senha com codigo invalido exibe erro", async ({ page }) => {
    await page.goto("/forgot-password");

    await page.fill("#email", E2E_EMAIL);
    await page.getByRole("button", { name: "Send reset code" }).click();
    await expect(page.getByText(/If the email exists/i)).toBeVisible({ timeout: 8000 });

    await page.fill("#verificationCode", "000000");
    await page.fill("#newPassword", "SenhaNova@1234");
    await page.fill("#confirmPassword", "SenhaNova@1234");
    await page.getByRole("button", { name: "Update password" }).click();

    const alert = page.locator('p[role="alert"]');
    await expect(alert).toBeVisible({ timeout: 10000 });
    await expect(alert).toContainText(/invalid|verification|codigo|code/i);
  });
});
