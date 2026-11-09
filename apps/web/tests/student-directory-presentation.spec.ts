import { expect, test, type Locator } from "@playwright/test";
import { useScenario } from "./support/student-api";

function style(locator: Locator, property: string) {
  return locator.evaluate(
    (element, name) => getComputedStyle(element).getPropertyValue(name),
    property,
  );
}

async function height(locator: Locator) {
  return (await locator.boundingBox())?.height ?? 0;
}

test.describe("student directory presentation", () => {
  test.beforeEach(async ({ page, request }) => {
    await useScenario(request, "populated");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await expect(page.getByRole("status", { name: "Loading students" })).toHaveCount(0);
    await page.evaluate(() => document.fonts.ready);
  });

  test("keeps the reference table geometry and colours", async ({ page }) => {
    const card = page.getByRole("table").locator("xpath=ancestor::div[contains(@class,'rounded-lg')][1]");
    expect(await style(card, "box-shadow")).toContain("rgba(0, 0, 0, 0.05) 0px 1px 2px 0px");

    expect(await height(page.getByRole("table").locator("thead tr"))).toBeCloseTo(52.5, 0);
    expect(await height(page.getByRole("table").locator("tbody tr").first())).toBe(64);

    const headerLabel = page.getByRole("table").locator("thead th").nth(1).locator("span");
    expect(await style(headerLabel, "font-size")).toBe("12px");
    expect(await style(headerLabel, "font-weight")).toBe("600");
    expect(await style(headerLabel, "color")).toBe("rgb(71, 85, 105)");

    const name = page.getByRole("table").locator("tbody th").first();
    expect(await style(name, "font-size")).toBe("12px");
    expect(await style(name, "color")).toBe("rgb(100, 116, 139)");
    expect(await style(name, "white-space")).toBe("nowrap");

    const search = page.getByRole("searchbox");
    expect(await height(search)).toBe(36);
    expect(await style(search, "padding-top")).toBe("8px");
    expect(await style(page.getByText("Not recorded"), "color"))
      .toBe("rgb(71, 85, 105)");
  });

  test("keeps the reference academic year tab", async ({ page }) => {
    const tab = page
      .getByRole("navigation", { name: "Academic year" })
      .getByRole("link", { name: "2026/27" });

    expect(await style(tab, "font-size")).toBe("9px");
    expect(await style(tab, "font-weight")).toBe("600");
    expect(await style(tab, "text-transform")).toBe("uppercase");
    expect(await style(tab, "color")).toBe("rgb(96, 11, 234)");
    expect(await style(tab, "background-color")).toBe("rgb(255, 255, 255)");
    expect(await style(tab, "box-shadow")).toContain("rgba(0, 0, 0, 0.05) 0px 8px 10px -1.5px");
    expect(await height(tab)).toBe(34);

    const inactiveTab = page
      .getByRole("navigation", { name: "Academic year" })
      .getByRole("link", { name: "2025/26" });
    expect(await style(inactiveTab, "color")).toBe("rgb(107, 114, 128)");
  });

  test("keeps the reference columns menu", async ({ page }) => {
    await page.getByRole("button", { name: "Columns" }).click();
    const menu = page.getByRole("dialog", { name: "Columns" });

    expect((await menu.boundingBox())?.width).toBe(224);
    expect(await style(menu, "box-shadow")).toContain("rgba(0, 0, 0, 0.1) 0px 10px 15px -3px");

    const item = menu.locator("label").first();
    expect(await style(item, "font-size")).toBe("14px");
    expect(await style(item, "border-radius")).toBe("4px");
    expect(await style(item.locator("span.flex-1"), "color")).toBe("rgb(17, 24, 39)");
    expect(await style(item.locator("span.flex-1"), "font-weight")).toBe("500");
  });

  test("keeps the reference student details sheet", async ({ page }) => {
    await page.getByRole("button", { name: "View details for Avery Ashgrove" }).click();
    const dialog = page.getByRole("dialog", { name: "Avery Ashgrove" });
    await expect(dialog.getByRole("definition").first()).toHaveText("DEMO-SYN-001");

    const sheet = dialog.locator("> div").first();
    expect(await style(sheet, "background-color")).toBe("rgb(252, 252, 252)");
    expect(await style(sheet, "border-top-color")).toBe("rgba(255, 255, 255, 0.6)");
    expect(await style(sheet, "box-shadow")).toContain("rgba(219, 220, 230, 0.5) 8px 20px 40px 0px");

    const card = dialog.locator("div[style*='187deg']");
    expect(await style(card, "background-image")).toBe(
      "linear-gradient(187deg, rgb(95, 95, 95) 5.38%, rgb(41, 41, 41) 92.39%)",
    );
    expect(await style(card, "padding-top")).toBe("24px");
    expect(await style(dialog.getByText("Placement for 2026/27"), "color"))
      .toBe("rgb(243, 244, 246)");
    expect(await style(dialog.getByText("Student reference"), "color"))
      .toBe("rgb(229, 231, 235)");
    expect(await style(dialog.getByText("Student details", { exact: true }), "color"))
      .toBe("rgb(113, 113, 122)");
  });

  test("keeps the phone toolbar and header on single rows without page overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/?q=a&sort=surname-desc");
    await expect(page.getByRole("status", { name: "Loading students" })).toHaveCount(0);
    await expect(page.getByRole("table")).toHaveCount(1);
    await page.evaluate(() => document.fonts.ready);

    const search = page.getByRole("search", { name: "Student directory" });
    for (const name of ["Search", "Clear search", "Refresh", "Columns"]) {
      const control = search.getByRole(name === "Clear search" ? "link" : "button", { name, exact: true });
      const box = await control.boundingBox();
      expect(box, name).not.toBeNull();
      expect(box!.x + box!.width, name).toBeLessThanOrEqual(390);
    }

    expect(await height(page.getByRole("table").locator("thead tr"))).toBeCloseTo(52.5, 0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth))
      .toBe(false);
  });
});

test.describe("sign-in presentation", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("keeps the reference sign-in measurements at desktop and phone widths", async ({
    page,
  }) => {
    for (const [viewport, cardHeight, panelVisible] of [
      [{ width: 1440, height: 900 }, 135, true],
      [{ width: 390, height: 844 }, 151, false],
    ] as const) {
      await page.setViewportSize(viewport);
      await page.goto("/sign-in");
      await page.evaluate(() => document.fonts.ready);

      const heading = page.getByRole("heading", { name: "Welcome back!" });
      expect(await style(heading, "font-size")).toBe("24px");
      expect(await style(heading, "font-weight")).toBe("700");
      expect(await style(heading, "color")).toBe("rgb(31, 41, 55)");

      const selected = page.locator("label").filter({ hasText: "Senior Leader" });
      const unselected = page.locator("label").filter({ hasText: "Classroom educator" });
      expect(await style(selected, "border-top-color")).toBe("rgb(124, 58, 237)");
      expect(await style(unselected, "border-top-color")).toBe("rgb(229, 231, 235)");
      expect(await style(unselected, "border-radius")).toBe("12px");
      expect(Math.round(await height(unselected))).toBe(cardHeight);

      expect(await height(page.getByLabel("Work email"))).toBe(40);
      expect(await height(page.getByLabel("Password"))).toBe(42);

      const submit = page.getByRole("button", { name: "Sign In" });
      expect(await height(submit)).toBe(48);
      expect(await style(submit, "background-image")).toBe(
        "linear-gradient(to right, rgb(30, 64, 175) 0%, rgb(59, 130, 246) 50%, rgb(76, 29, 149) 100%)",
      );

      expect(await page.locator("div.bg-linear-to-br.from-slate-100").isVisible()).toBe(panelVisible);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
    }
  });
});
