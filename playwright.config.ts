import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: ["save-smoke.spec.ts", "combat-visuals.spec.ts", "ux-accessibility.spec.ts", "dungeon-engine.spec.ts", "character-art.spec.ts", "presence.spec.ts"],
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:4173/Depths-of-the-Fractured-Mind/", browserName: "chromium",
    // Same explicit hardware profile used by the dungeon benchmark/captures.
    // Defaults retain the pinned headless-shell profile; assertions/timeouts are unchanged.
    channel: process.env.DUNGEON_BROWSER_CHANNEL,
    launchOptions: { args: process.env.DUNGEON_ENABLE_GPU === "1" ? ["--enable-gpu"] : [] },
  },
  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --port 4173 --strictPort",
    url: "http://127.0.0.1:4173/Depths-of-the-Fractured-Mind/",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
