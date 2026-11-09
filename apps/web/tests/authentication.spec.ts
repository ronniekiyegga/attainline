import { expect, test, type Page } from "@playwright/test";
import {
  authRequests,
  receivedRequests,
  sessionCookie,
  standInAuth,
  studentApiUrl,
  useScenario,
} from "./support/student-api";

async function signIn(page: Page, email: string, password: string) {
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

function signInError(page: Page) {
  return page.locator("#sign-in-error[role=alert]");
}

async function sessionCookieValue(page: Page) {
  return (await page.context().cookies()).find(({ name }) => name === sessionCookie.name);
}

async function openAccountMenu(page: Page) {
  await page.locator("header").getByRole("button", { name: "Toggle Sidebar" }).click();
}

test.describe("signed out", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("redirects to sign-in and keeps the session out of browser code", async ({
    page,
    request,
  }) => {
    await useScenario(request, "populated");
    const browserApiCalls: string[] = [];
    page.on("request", (sent) => {
      if (sent.url().startsWith(studentApiUrl)) {
        browserApiCalls.push(sent.url());
      }
    });

    await page.goto("/?year=2026");
    await expect(page).toHaveURL("/sign-in");
    expect(await receivedRequests(request)).toEqual([]);

    await signIn(page, standInAuth.email, standInAuth.password);

    await expect(page).toHaveURL("/dashboard");
    await expect(page.getByRole("heading", { name: /Welcome Back, Headteacher/ })).toBeVisible();

    const cookie = await sessionCookieValue(page);
    expect(cookie).toMatchObject({ httpOnly: true, secure: true, sameSite: "Lax", path: "/" });
    expect(cookie?.expires).toBeGreaterThan(Date.now() / 1000 + 7 * 60 * 60);
    expect(await page.evaluate(() => document.cookie)).not.toContain(sessionCookie.name);

    const [signInRequest] = await authRequests(request);
    expect(signInRequest).toMatchObject({ method: "POST", path: "/auth/sessions", origin: null });
    expect((await receivedRequests(request)).every(
      ({ authorization }) => authorization === `Bearer ${cookie?.value}`,
    )).toBe(true);
    expect(browserApiCalls).toEqual([]);
  });

  test("explains a rejected sign-in without saying which field was wrong", async ({
    page,
    request,
  }) => {
    await useScenario(request, "populated");
    await page.goto("/sign-in");

    await signIn(page, standInAuth.email, "not-the-password");

    await expect(signInError(page)).toHaveText("Email or password is incorrect.");
    await expect(page.getByLabel("Work email")).toHaveValue(standInAuth.email);
    await expect(page.getByLabel("Password")).toHaveValue(standInAuth.password);
    expect(await sessionCookieValue(page)).toBeUndefined();

    await signIn(page, "someone.else@example.test", standInAuth.password);
    await expect(signInError(page)).toHaveText("Email or password is incorrect.");
  });

  test("demo account cards fill the matching credentials", async ({ page, request }) => {
    await useScenario(request, "populated");
    await page.goto("/sign-in");

    const leader = page.getByRole("radio", { name: /Senior Leader/ });
    const teacher = page.getByRole("radio", { name: /Teacher/ });
    await expect(leader).toBeChecked();
    await expect(page.getByLabel("Work email")).toHaveValue("morgan.vale@example.test");
    await expect(page.getByLabel("Password")).toHaveValue(standInAuth.password);

    await teacher.focus();
    await page.keyboard.press("Space");
    await expect(teacher).toBeChecked();
    await expect(page.getByLabel("Work email")).toHaveValue("sasha.wren@example.test");
    await expect(page.getByLabel("Password")).toHaveValue(standInAuth.password);
  });

  test("explains a locked account", async ({ page, request }) => {
    await useScenario(request, "populated");
    await page.goto("/sign-in");

    await signIn(page, standInAuth.lockedEmail, standInAuth.password);

    await expect(signInError(page)).toHaveText(
      "Too many failed attempts. Try again in 30 minutes.",
    );
  });
});

test.describe("signed in", () => {
  test("signing out revokes the session and protects the directory", async ({
    page,
    request,
  }) => {
    await useScenario(request, "populated");
    await page.context().clearCookies();
    await page.goto("/sign-in");
    await signIn(page, standInAuth.email, standInAuth.password);
    await expect(page).toHaveURL("/dashboard");
    const token = (await sessionCookieValue(page))?.value;

    await openAccountMenu(page);
    await page.getByRole("button", { name: "Sign out" }).click();

    await expect(page).toHaveURL("/sign-in");
    expect(await sessionCookieValue(page)).toBeUndefined();
    expect((await authRequests(request)).filter(({ method }) => method === "DELETE")).toEqual([
      { method: "DELETE", path: "/auth/session", authorization: `Bearer ${token}`, origin: null },
    ]);

    await page.context().addCookies([{ ...sessionCookie, value: token ?? "" }]);
    await page.goto("/");
    await expect(page).toHaveURL("/sign-in");
  });

  test("returns to sign-in when the session ends during use", async ({ page, request }) => {
    await useScenario(request, "populated");
    await page.goto("/");
    await expect(page.getByRole("table")).toBeVisible();

    await useScenario(request, "session-expired");
    await page.getByRole("button", { name: "Refresh" }).click();

    await expect(page).toHaveURL("/sign-in");
    await expect(page.getByRole("heading", { name: "Welcome back!" })).toBeVisible();
  });

  test("switching school replaces the session cookie", async ({ page, request }) => {
    await useScenario(request, "populated");
    await page.goto("/");
    await openAccountMenu(page);
    await expect(page.getByTitle(standInAuth.academy.name)).toBeVisible();

    await page.getByLabel("School").selectOption(standInAuth.college.id);
    await page.getByRole("button", { name: "Switch", exact: true }).click();

    await expect(page.getByTitle(standInAuth.college.name)).toBeVisible();
    expect((await sessionCookieValue(page))?.value).toBe(standInAuth.college.token);
    expect((await authRequests(request)).find(({ method }) => method === "PUT")).toMatchObject({
      path: "/auth/session/organisation",
      authorization: `Bearer ${standInAuth.academy.token}`,
    });
  });
});
