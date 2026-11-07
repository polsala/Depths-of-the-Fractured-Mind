import { expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import eventData from "../public/data/events.json";

it("rejects unknown prerequisite item IDs before shipping event data", () => {
  const directory = mkdtempSync(join(tmpdir(), "depths-events-"));
  try {
    const fixture = structuredClone(eventData);
    const choice = fixture.events.find((event) => event.id === "locked_safe")!.choices[0];
    choice.requiresItems = ["item_that_does_not_exist"];
    const path = join(directory, "events.json");
    writeFileSync(path, JSON.stringify(fixture));
    const result = spawnSync(process.execPath, ["utils/validate-events.cjs", path], {
      cwd: process.cwd(), encoding: "utf8",
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/requiresItems must contain known item IDs/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
