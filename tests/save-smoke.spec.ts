import { test, expect } from "@playwright/test";

const SAVE_KEY = "depths-of-the-fractured-mind.run.v1";

test("Begin → progress → reload → Continue keeps the exploration screen and map view", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await page.getByRole("button", { name: "Begin Your Descent" }).click();
  const viewport = await page.locator(".viewport-container").elementHandle();
  await page.keyboard.press("q");
  expect(await viewport?.evaluate((node) => node === document.querySelector(".viewport-container"))).toBe(true);
  const beforeReload = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).state.location, SAVE_KEY);
  expect(beforeReload.direction).toBe("west");
  await page.reload();
  await page.getByRole("button", { name: /Continue · Depth 1/ }).click();
  const afterReload = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).state.location, SAVE_KEY);
  expect(afterReload).toEqual(beforeReload);
  await expect(page.locator(".dungeon-viewport")).toBeVisible();
  expect(errors).toEqual([]);
});

test("export/import, explicit deletion and corrupt-save recovery", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Begin Your Descent" }).click();
  await page.keyboard.press("e");
  await page.getByRole("button", { name: "Save & Return to Title" }).click();
  const original = await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export Save" }).click();
  expect((await downloadPromise).suggestedFilename()).toBe("depths-of-the-fractured-mind-save.json");

  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Begin Your Descent" }).click();
  expect(await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY)).toBe(original);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete Save" }).click();
  expect(await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY)).toBeNull();
  await page.locator("input[type=file]").setInputFiles({ name: "save.json", mimeType: "application/json", buffer: Buffer.from(original!) });
  await expect(page.getByRole("button", { name: "Save & Return to Title" })).toBeVisible();

  await page.evaluate((key) => localStorage.setItem(key, "{broken"), SAVE_KEY);
  await page.reload();
  await expect(page.getByRole("button", { name: /Continue/ })).toHaveCount(0);
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("input[type=file]").setInputFiles({ name: "save.json", mimeType: "application/json", buffer: Buffer.from(original!) });
  await expect(page.getByRole("button", { name: "Save & Return to Title" })).toBeVisible();
});

test("touch NPC conversation survives reload and keyboard can reopen it", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await page.getByRole("button", { name: "Begin Your Descent" }).tap();
  await page.getByRole("button", { name: "Talk to the Keeper" }).tap();
  await expect(page.locator(".dialogue-portrait")).toBeVisible();
  await page.getByRole("button", { name: /Tell us where the director hid the evidence/ }).tap();
  await expect(page.getByText(/Look behind the resignation letter/)).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: /Continue · Depth 1/ }).tap();
  await expect(page.getByText(/Look behind the resignation letter/)).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).tap();
  await expect(page.getByRole("button", { name: "Talk to the Keeper" })).toBeVisible();
  await page.keyboard.press("t");
  await expect(page.getByText(/What have you learned/)).toBeVisible();
  await page.getByRole("button", { name: "Leave conversation" }).tap();
  expect(errors).toEqual([]);
  await context.close();
});
