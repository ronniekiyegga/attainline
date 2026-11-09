import { defineConfig, devices } from "@playwright/test";
import {
  sessionCookie,
  standInAuth,
  studentApiPort,
  studentApiUrl,
} from "./tests/support/student-api";

const webPort = 3101;

export default defineConfig({
  testDir: "./tests",
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://127.0.0.1:${webPort}`,
    trace: "retain-on-failure",
    storageState: { cookies: [sessionCookie], origins: [] },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "node tests/support/student-api-server.mts",
      url: `${studentApiUrl}/__health`,
      reuseExistingServer: !process.env.CI,
      env: {
        STUDENT_API_PORT: String(studentApiPort),
        STAND_IN_AUTH: JSON.stringify(standInAuth),
      },
    },
    {
      command: `pnpm start --hostname 127.0.0.1 --port ${webPort}`,
      url: `http://127.0.0.1:${webPort}`,
      reuseExistingServer: !process.env.CI,
      env: { ATTAINLINE_API_URL: studentApiUrl },
    },
  ],
});
