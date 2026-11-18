import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.DEMO_BASE_URL;

if (!baseURL || !URL.canParse(baseURL)) {
  throw new Error("DEMO_BASE_URL must be an absolute URL");
}

export default defineConfig({
  testDir: "./smoke",
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    storageState: { cookies: [], origins: [] },
    ...devices["Desktop Chrome"],
  },
});
