import { expect, test, type Page } from "@playwright/test";
import {
  receivedRequests,
  studentListRequests,
  useScenario,
} from "./support/student-api";

const averyId = "0a3f5c1e-1111-4111-8111-000000000001";

function directoryRows(page: Page) {
  return page.getByRole("table").getByRole("rowheader");
}

function sortLink(page: Page) {
  return page.getByRole("columnheader", { name: /sorted by surname/ }).getByRole("link");
}

function detailsDialog(page: Page) {
  return page.getByRole("dialog", { name: /Avery Ashgrove|Brackenridge|Calla Cindermoor/ });
}

test.describe("student directory sorting", () => {
  test("toggles surname order, resets pagination and keeps filters", async ({
    page,
    request,
  }) => {
    await useScenario(request, "populated");
    await page.goto("/?year=2026&q=e&cursor=page-2");

    const header = page.getByRole("columnheader", { name: /sorted by surname/ });
    await expect(header).toHaveAttribute("aria-sort", "ascending");

    await sortLink(page).click();

    await expect(page).toHaveURL("/?year=2026&q=e&sort=surname-desc");
    await expect(header).toHaveAttribute("aria-sort", "descending");
    await expect(directoryRows(page)).toHaveText(["Calla Cindermoor", "Brackenridge"]);
    expect((await studentListRequests(request)).at(-1)).toMatchObject({
      academicYearStart: "2026",
      q: "e",
      sort: "surname-desc",
      cursor: null,
    });

    await page.getByRole("link", { name: "Next page" }).click();
    await expect(page).toHaveURL("/?year=2026&q=e&sort=surname-desc&cursor=desc-page-2");
    await expect(directoryRows(page)).toHaveText(["Avery Ashgrove"]);

    await page.reload();
    await expect(directoryRows(page)).toHaveText(["Avery Ashgrove"]);
    await expect(header).toHaveAttribute("aria-sort", "descending");

    await page.getByRole("navigation", { name: "Academic year" })
      .getByRole("link", { name: "2025/26" }).click();
    await expect(page).toHaveURL("/?year=2025&q=e&sort=surname-desc");

    const search = page.getByRole("search", { name: "Student directory" });
    await search.getByRole("searchbox").fill("Elm");
    await search.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page).toHaveURL("/?year=2025&q=Elm&sort=surname-desc");

    await page.getByRole("link", { name: "Clear search" }).click();
    await expect(page).toHaveURL("/?year=2025&sort=surname-desc");

    await sortLink(page).click();
    await expect(page).toHaveURL("/?year=2025");
  });

  test("rejects an unsupported sort without calling the API", async ({ page, request }) => {
    await useScenario(request, "populated");
    await page.goto("/?year=2026&sort=firstName");

    await expect(page.getByRole("heading", { name: "This sort link is invalid" }))
      .toBeVisible();
    expect(await studentListRequests(request)).toEqual([]);

    await page.getByRole("link", { name: "Sort by surname A to Z" }).click();
    await expect(page).toHaveURL("/?year=2026");
  });

  test("retry after a list failure keeps year, search and sort", async ({ page, request }) => {
    await useScenario(request, "list-unavailable");
    await page.goto("/?year=2026&q=a&sort=surname-desc");

    await expect(page.getByRole("link", { name: "Try again" }))
      .toHaveAttribute("href", "/?year=2026&q=a&sort=surname-desc");

    await useScenario(request, "populated");
    await page.getByRole("link", { name: "Try again" }).click();
    await expect(directoryRows(page)).toHaveText(["Calla Cindermoor", "Brackenridge"]);
  });
});

test.describe("student directory columns", () => {
  test("hides and restores optional columns by keyboard", async ({ page, request }) => {
    await useScenario(request, "populated");
    await page.goto("/");

    const trigger = page.getByRole("button", { name: "Columns" });
    await trigger.focus();
    await page.keyboard.press("Enter");

    const menu = page.getByRole("dialog", { name: "Columns" });
    await expect(menu).toBeVisible();

    const reference = menu.getByRole("checkbox", { name: "Student reference" });
    await expect(reference).toBeChecked();
    await expect(menu.getByRole("checkbox", { name: "Class" })).toBeChecked();
    await expect(menu.getByRole("checkbox", { name: /^Student$/ })).toHaveCount(0);

    await reference.focus();
    await page.keyboard.press("Space");
    await expect(reference).not.toBeChecked();

    const classToggle = menu.getByRole("checkbox", { name: "Class" });
    await classToggle.focus();
    await page.keyboard.press("Space");

    await expect(page.getByRole("columnheader")).toHaveText([
      /^Student/,
      "Year group",
      "Details",
    ]);
    await expect(
      page.getByRole("row", { name: /Avery Ashgrove/ }).getByRole("cell"),
    ).toHaveText(["Year 7", "View"]);

    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(trigger).toBeFocused();

    await page.getByRole("link", { name: "Next page" }).click();
    await expect(directoryRows(page)).toHaveText(["Calla Cindermoor"]);
    await expect(page.getByRole("columnheader")).toHaveText([
      /^Student/,
      "Year group",
      "Details",
    ]);

    await trigger.click();
    await menu.getByText("Student reference").click();
    await expect(menu.getByRole("checkbox", { name: "Student reference" })).toBeChecked();
    await expect(page.getByRole("columnheader", { name: "Student reference" }))
      .toBeVisible();
  });

  test("keeps column choices through a failed page and its retry", async ({
    page,
    request,
  }) => {
    await useScenario(request, "populated");
    await page.goto("/");

    await page.getByRole("button", { name: "Columns" }).click();
    await page.getByRole("dialog", { name: "Columns" }).getByText("Class").click();
    await page.keyboard.press("Escape");

    await useScenario(request, "unavailable");
    await page.getByRole("link", { name: "Next page" }).click();
    await expect(page.getByRole("heading", { name: "We couldn’t load the directory" }))
      .toBeVisible();

    await useScenario(request, "populated");
    await page.getByRole("link", { name: "Try again" }).click();

    await expect(directoryRows(page)).toHaveText(["Calla Cindermoor"]);
    await expect(page.getByRole("columnheader", { name: "Class" })).toHaveCount(0);
  });

  test("keeps the empty message spanning the visible columns", async ({ page, request }) => {
    await useScenario(request, "empty");
    await page.goto("/");

    await page.getByRole("button", { name: "Columns" }).click();
    await page.getByRole("dialog", { name: "Columns" }).getByText("Year group").click();

    const empty = page.getByRole("cell", { name: "No students are enrolled in 2026/27." });
    await expect(empty).toHaveAttribute("colspan", "4");
  });
});

test.describe("student directory refresh", () => {
  test("does not spin the refresh icon when reduced motion is requested", async ({
    page,
    request,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await useScenario(request, "populated", { listDelay: 1000 });
    await page.goto("/");

    const refresh = page.getByRole("button", { name: /^Refresh/ });
    await refresh.click();

    await expect(refresh).toHaveText("Refreshing…");
    await expect(refresh.locator("svg")).toHaveCSS("animation-name", "none");
  });

  test("re-fetches in place, shows pending state and keeps filters", async ({
    page,
    request,
  }) => {
    await useScenario(request, "empty");
    await page.goto("/?year=2026&q=a&sort=surname-desc");
    await expect(
      page.getByRole("cell", { name: "No students in 2026/27 match this search." }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Columns" }).click();
    await page.getByRole("dialog", { name: "Columns" }).getByText("Class").click();
    await page.keyboard.press("Escape");

    await useScenario(request, "populated", { listDelay: 1000 });

    const refresh = page.getByRole("button", { name: /^Refresh/ });
    await refresh.click();

    await expect(refresh).toBeDisabled();
    await expect(refresh).toHaveAttribute("aria-busy", "true");
    await expect(refresh).toHaveText("Refreshing…");

    await expect(directoryRows(page)).toHaveText(["Calla Cindermoor", "Brackenridge"]);
    await expect(refresh).toBeEnabled();
    await expect(page).toHaveURL("/?year=2026&q=a&sort=surname-desc");
    await expect(page.getByRole("columnheader", { name: "Class" })).toHaveCount(0);

    const requests = await studentListRequests(request);
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({ academicYearStart: "2026", q: "a", sort: "surname-desc" });
  });

  test("recovers from a list failure without leaving the page", async ({ page, request }) => {
    await useScenario(request, "list-unavailable");
    await page.goto("/?year=2025");

    await expect(page.getByRole("heading", { name: "We couldn’t load the directory" }))
      .toBeVisible();

    await useScenario(request, "populated");
    await page.getByRole("button", { name: /^Refresh/ }).click();

    await expect(directoryRows(page)).toHaveText(["Dorian Elmscott"]);
    await expect(page).toHaveURL("/?year=2025");
  });
});

test.describe("student details", () => {
  test("opens by keyboard, shows the placement and returns focus", async ({
    page,
    request,
  }) => {
    await useScenario(request, "populated");
    await page.goto("/");

    const opener = page.getByRole("button", { name: "View details for Brackenridge" });
    await opener.focus();
    await page.keyboard.press("Enter");

    const dialog = page.getByRole("dialog", { name: "Brackenridge" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Placement for 2026/27")).toBeVisible();
    await expect(dialog.getByRole("definition")).toHaveText([
      "DEMO-SYN-002",
      "Year 7",
      "Not recorded",
    ]);
    await expect(dialog.getByRole("button", { name: "Close" })).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(dialog.getByRole("button", { name: "Close" })).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(opener).toBeFocused();
  });

  test("shows loading, unavailable and retry states", async ({ page, request }) => {
    await useScenario(request, "details-unavailable", { slowStudents: [averyId] });
    await page.goto("/");

    await page.getByRole("button", { name: "View details for Avery Ashgrove" }).click();
    const dialog = detailsDialog(page);

    await expect(dialog.getByRole("status")).toHaveText("Loading details…");
    await expect(dialog.getByText("Student details are temporarily unavailable."))
      .toBeVisible();

    await useScenario(request, "populated");
    await dialog.getByRole("button", { name: "Try again" }).click();

    await expect(dialog.getByRole("definition").first()).toHaveText("DEMO-SYN-001");
  });

  test("reopening a student fetches again instead of showing the last result", async ({
    page,
    request,
  }) => {
    await useScenario(request, "details-unavailable");
    await page.goto("/");

    const opener = page.getByRole("button", { name: "View details for Avery Ashgrove" });
    await opener.click();
    await expect(detailsDialog(page).getByText("Student details are temporarily unavailable."))
      .toBeVisible();
    await page.keyboard.press("Escape");

    await useScenario(request, "populated", { slowStudents: [averyId] });
    await opener.click();

    await expect(detailsDialog(page).getByRole("status")).toHaveText("Loading details…");
    await expect(detailsDialog(page).getByText("Student details are temporarily unavailable."))
      .toHaveCount(0);
    await expect(detailsDialog(page).getByRole("definition").first()).toHaveText("DEMO-SYN-001");
  });

  test("explains a student who is no longer enrolled in the year", async ({
    page,
    request,
  }) => {
    await useScenario(request, "populated");
    await page.goto("/");

    await useScenario(request, "empty");
    await page.getByRole("button", { name: "View details for Avery Ashgrove" }).click();

    await expect(detailsDialog(page)).toContainText(
      "This student is not enrolled in 2026/27.",
    );
  });

  test("ignores a slow response for a previously selected student", async ({
    page,
    request,
  }) => {
    await useScenario(request, "populated", { slowStudents: [averyId] });
    await page.goto("/");

    await page.getByRole("button", { name: "View details for Avery Ashgrove" }).click();
    await expect(detailsDialog(page).getByRole("status")).toBeVisible();
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "View details for Brackenridge" }).click();
    const dialog = page.getByRole("dialog", { name: "Brackenridge" });
    await expect(dialog.getByRole("definition").first()).toHaveText("DEMO-SYN-002");

    await page.waitForTimeout(2000);
    await expect(dialog.getByRole("definition").first()).toHaveText("DEMO-SYN-002");
    await expect(dialog).not.toContainText("DEMO-SYN-001");
  });
});

test.describe("student directory layout", () => {
  for (const viewport of [
    { name: "desktop", width: 1440, height: 900 },
    { name: "phone", width: 390, height: 844 },
  ]) {
    test(`has no page-level horizontal overflow on ${viewport.name}`, async ({
      page,
      request,
    }) => {
      await useScenario(request, "populated");
      await page.setViewportSize(viewport);
      await page.goto("/");
      await expect(directoryRows(page)).toHaveText(["Avery Ashgrove", "Brackenridge"]);

      await page.getByRole("button", { name: "Columns" }).click();
      await expect(page.getByRole("dialog", { name: "Columns" })).toBeVisible();

      const overflow = () => page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      expect(await overflow()).toBe(false);

      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: "View details for Avery Ashgrove" }).click();
      await expect(page.getByRole("dialog", { name: "Avery Ashgrove" })
        .getByRole("definition").first()).toHaveText("DEMO-SYN-001");
      expect(await overflow()).toBe(false);
    });
  }
});

test.describe("student details proxy", () => {
  test("returns only the directory fields, uncached", async ({ request }) => {
    await useScenario(request, "details-extra-fields");

    const response = await request.get(`/api/students/${averyId}?year=2026`);

    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toBe("no-store");
    expect(Object.keys(await response.json()).sort()).toEqual([
      "classGroup",
      "firstName",
      "id",
      "institutionStudentRef",
      "surname",
      "yearGroup",
    ]);
  });

  test("rejects malformed requests without calling the API", async ({ request }) => {
    await useScenario(request, "populated");

    for (const path of [
      "/api/students/not-a-uuid?year=2026",
      `/api/students/${averyId}`,
      `/api/students/${averyId}?year=2026&year=2025`,
      `/api/students/${averyId}?year=abc`,
    ]) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(400);
      expect(await response.json(), path).toEqual({ error: "Invalid student request" });
    }

    expect(await receivedRequests(request)).toEqual([]);
  });
});
