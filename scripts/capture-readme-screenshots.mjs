import path from "node:path";
import { chromium } from "playwright";

const rootDir = process.cwd();
const outputDir = path.join(rootDir, "docs", "assets", "readme");

async function capture() {
  await import("node:fs").then((fs) => fs.mkdirSync(outputDir, { recursive: true }));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: "light",
    locale: "pt-BR",
  });

  const page = await context.newPage();

  await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(outputDir, "screenshot-home.png"), fullPage: true });

  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(outputDir, "screenshot-login.png"), fullPage: true });

  await page.goto("http://localhost:3000/forgot-password", { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(outputDir, "screenshot-forgot-password.png"), fullPage: true });

  await browser.close();
  console.log("SCREENSHOTS_OK");
}

capture().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
