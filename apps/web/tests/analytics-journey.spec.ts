import { expect, test, type Page } from "@playwright/test";
import { receivedRequests, standInAuth, useScenario } from "./support/student-api";

async function signIn(page: Page) {
  await page.getByLabel("Work email").fill(standInAuth.email);
  await page.getByLabel("Password").fill(standInAuth.password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

async function openAccountMenu(page: Page) {
  if (!(await page.getByRole("button", { name: "Sign out" }).isVisible())) {
    await page.locator("header").getByRole("button", { name: "Toggle Sidebar" }).click();
  }
}

test("completes the signed-in dashboard, analytics, rankings, directory and profile journey", async ({ page, request }) => {
  await useScenario(request, "populated");
  await page.context().clearCookies();
  await page.goto("/sign-in");
  await signIn(page);

  await expect(page).toHaveURL("/dashboard");
  await expect(page.getByRole("heading", { name: /Welcome Back, Headteacher/ })).toBeVisible();
  await expect(page.getByRole("region", { name: "Where should leadership focus?" })).toBeVisible();

  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Analytics" }).click();
  await expect(page).toHaveURL("/analytics");
  await expect(page.getByRole("heading", { name: "Attainment Analysis", exact: true })).toBeVisible();
  await expect(page.getByRole("table", { name: "Assessment averages and cohort coverage", exact: true })).toBeAttached();
  await expect(
    page.getByText("Select Group:", { exact: true }).locator("..").getByText("Visible cohort", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Role scope", { exact: true })).toBeVisible();

  const cognitiveChart = page.getByRole("group", {
    name: "2.1 Cognitive attainment average standard age score and stanine scales",
  });
  await expect(cognitiveChart).toHaveCSS("height", "500px");
  const chartBars = cognitiveChart.getByRole("button");
  await expect(chartBars).toHaveCount(4);
  await expect(chartBars.nth(0).locator("span").first()).toHaveCSS("background-image", /linear-gradient/);
  await expect(chartBars.nth(1).locator("span").first()).toHaveCSS("background-image", /linear-gradient/);
  await chartBars.first().focus();
  await expect(page.getByRole("tooltip")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Attainment Analysis Key Findings" })).toBeVisible();

  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Rankings" }).click();
  await expect(page).toHaveURL("/rankings");
  await expect(page.getByRole("heading", { name: "Student rankings" })).toBeVisible();
  await expect(page.getByRole("table", { name: "Student ranking by standard age score" })).toBeVisible();

  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Students" }).click();
  await expect(page).toHaveURL("/");
  await page.getByRole("link", { name: "View profile for Avery Ashgrove" }).click();
  await expect(page.getByRole("dialog", { name: "Avery Ashgrove" })).toBeVisible();
  await page.keyboard.press("Escape");

  await openAccountMenu(page);
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/sign-in");
});

test("switching school replaces dashboard scope and renders its empty state", async ({ page, request }) => {
  await useScenario(request, "populated");
  await page.goto("/dashboard");
  await openAccountMenu(page);
  await page.getByLabel("School").selectOption(standInAuth.college.id);
  await page.getByRole("button", { name: "Switch", exact: true }).click();

  await expect(page).toHaveURL("/dashboard");
  await expect(page.getByTitle(standInAuth.college.name)).toBeVisible();
  await expect(page.getByRole("heading", { name: "No students in this cohort" })).toBeVisible();
});

test("renders the original teacher dashboard composition for a teacher membership", async ({ page, request }) => {
  await useScenario(request, "teacher-dashboard");
  await page.goto("/dashboard");

  await expect(page.getByRole("heading", { name: /Welcome Back, Teacher/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Export" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "QLA" })).toBeDisabled();
  const overview = page.getByRole("region", { name: "Cohort overview" });
  await expect(overview).toBeVisible();
  const cards = overview.getByRole("article");
  await expect(cards).toHaveCount(4);
  for (let index = 0; index < 4; index += 1) {
    await expect(cards.nth(index)).toHaveCSS("height", "166px");
    await expect(cards.nth(index)).toHaveCSS("border-radius", "8px");
  }

  const info = cards.first().getByRole("button", { name: "More information: PROGRESS" });
  await info.focus();
  const tooltip = page.getByRole("tooltip");
  await expect(tooltip).toBeVisible();
  const tooltipBounds = await tooltip.boundingBox();
  expect(tooltipBounds?.x).toBeGreaterThanOrEqual(0);
  expect(tooltipBounds?.y).toBeGreaterThanOrEqual(0);
  expect((tooltipBounds?.x ?? 0) + (tooltipBounds?.width ?? 0)).toBeLessThanOrEqual(1280);
  await info.blur();
  await page.evaluate(() => window.scrollTo(0, 120));
  await info.focus();
  await expect.poll(async () => (await tooltip.boundingBox())?.y ?? -1).toBeGreaterThanOrEqual(0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(cards.first().getByRole("button", { name: "Cohort signal 1: 33.3% on track" })).toHaveCSS("background-image", /linear-gradient/);

  await expect(page.getByRole("region", { name: "PERFORMANCE OVERVIEW" })).toBeVisible();
  await expect(page.getByText("Year 7 assessment review")).toBeVisible();
  await expect(page.getByText("Demo schedule")).toBeVisible();
  const rank = page.getByRole("region", { name: "RANK" });
  await expect(rank).toBeVisible();
  await expect(rank.getByRole("button", { name: "Show selected student score" })).toHaveAttribute("aria-pressed", "true");
  await expect(rank.getByText("111 SAS").first()).toBeVisible();
  await rank.getByRole("button", { name: "Show ranking bars" }).click();
  await expect(rank.getByRole("button", { name: "Show ranking bars" })).toHaveAttribute("aria-pressed", "true");

  const beforeHover = await receivedRequests(request);
  await rank.getByRole("link", { name: "Calla Cindermoor" }).hover();
  await page.waitForTimeout(200);
  expect(await receivedRequests(request)).toEqual(beforeHover);

  const updates = page.getByRole("region", { name: "Performance Signal Alerts" });
  await expect(updates).toBeVisible();
  await expect(updates.getByText("Assessment coverage is 66.7%")).toBeVisible();
});

test("shows a bounded error state when analytics requests fail", async ({ page, request }) => {
  await useScenario(request, "analytics-unavailable");
  await page.goto("/analytics");

  await expect(page.getByRole("alert").filter({ hasText: "Analytics are unavailable" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
});

test("applies ranking filters by keyboard and keeps them in the URL", async ({ page, request }) => {
  await useScenario(request, "populated");
  await page.goto("/rankings");

  const measure = page.getByLabel("Assessment measure");
  await measure.focus();
  await measure.selectOption("NGRT_READING");
  const yearGroup = page.getByLabel("Year group");
  await yearGroup.selectOption("7");
  await page.getByRole("button", { name: "Apply filters" }).focus();
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/\/rankings\?year=2026&measure=NGRT_READING&yearGroup=7/);
  await expect(page.getByRole("heading", { name: "Student rankings" })).toBeVisible();
  await expect(measure).toHaveValue("NGRT_READING");
  await expect(yearGroup).toHaveValue("7");
});

for (const width of [390, 768, 1024, 1440]) {
  test(`keeps analytics and rankings within the ${width}px viewport`, async ({ page, request }) => {
    await useScenario(request, "teacher-dashboard");
    await page.setViewportSize({ width, height: 900 });

    for (const path of ["/dashboard", "/analytics", "/rankings"]) {
      await page.goto(path);
      await expect(page.locator("main, #main-content").first()).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    }

    await useScenario(request, "populated");
    await page.goto("/dashboard");
    await expect(page.getByRole("region", { name: "Where should leadership focus?" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });
}
