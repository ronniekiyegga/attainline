import { expect, test } from "@playwright/test";

const email = process.env.DEMO_EMAIL ?? "morgan.vale@example.test";
const password = process.env.DEMO_PASSWORD ?? "AttainlineDemo!2026";

if (!email.endsWith("@example.test")) {
  throw new Error("Smoke tests only accept synthetic .example.test accounts");
}

test("checks readiness and the synthetic demo journey", async ({ page, request }) => {
  const health = await request.get("/health");
  expect(health.status()).toBe(200);
  expect(await health.json()).toEqual({ status: "ready" });

  await page.goto("/sign-in");
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: /Welcome Back/ })).toBeVisible();

  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Analytics" }).click();
  await expect(page.getByRole("heading", { name: "Attainment Analysis", exact: true })).toBeVisible();

  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Rankings" }).click();
  await expect(page.getByRole("heading", { name: "Student rankings" })).toBeVisible();

  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Students" }).click();
  await page.getByRole("link", { name: /View profile for/ }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");

  if (!(await page.getByRole("button", { name: "Sign out" }).isVisible())) {
    await page.locator("header").getByRole("button", { name: "Toggle Sidebar" }).click();
  }
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
});
