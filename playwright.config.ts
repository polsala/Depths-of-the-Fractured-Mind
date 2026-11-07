import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: ["save-smoke.spec.ts", "combat-visuals.spec.ts"],
  use: { baseURL: "http://127.0.0.1:4173/Depths-of-the-Fractured-Mind/", browserName: "chromium" },
  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --port 4173 --strictPort",
    url: "http://127.0.0.1:4173/Depths-of-the-Fractured-Mind/",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
