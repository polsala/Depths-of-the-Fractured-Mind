import { expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import eventData from "../public/data/events.json";

function validateFixture(fixture: unknown): ReturnType<typeof spawnSync> {
  const directory = mkdtempSync(join(tmpdir(), "depths-events-"));
  try {
    const path = join(directory, "events.json");
    writeFileSync(path, JSON.stringify(fixture));
    return spawnSync(process.execPath, ["utils/validate-events.cjs", path], {
      cwd: process.cwd(), encoding: "utf8",
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

it("rejects unknown prerequisite item IDs before shipping event data", () => {
  const fixture = structuredClone(eventData);
  fixture.events.find((event) => event.id === "locked_safe")!.choices[0].requiresItems = ["item_that_does_not_exist"];
  const result = validateFixture(fixture);
  expect(result.status).toBe(1);
  expect(result.stderr).toMatch(/requiresItems must contain known item IDs/);
});

it("rejects orphan events and invalid progression references", () => {
  const fixture = structuredClone(eventData);
  fixture.pools.find((pool) => pool.id === "depth_2_events")!.events =
    fixture.pools.find((pool) => pool.id === "depth_2_events")!.events.filter((id) => id !== "director_office");
  fixture.pools.find((pool) => pool.id === "depth_1_events")!.events.push("engine_whispers");
  const result = validateFixture(fixture);
  expect(result.status).toBe(1);
  expect(result.stderr).toMatch(/Unreachable event 'director_office'/);
  expect(result.stderr).toMatch(/cannot trigger at depth 1/);
});
