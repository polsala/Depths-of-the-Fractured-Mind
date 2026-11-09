import { expect, it } from "vitest";
import { PerformanceDiagnostics } from "../src/graphics/dungeon/PerformanceDiagnostics";
import type { WebGLRenderer } from "three";

it("drops startup warmup, keeps real stalls and measures the full explicit reset window", () => {
  const diagnostics = new PerformanceDiagnostics();
  const renderer = { info: { render: { calls: 2, triangles: 10 }, memory: { geometries: 1, textures: 1 }, programs: [] },
    getPixelRatio: () => 1 } as unknown as WebGLRenderer;
  for (let frame = 1; frame <= 45; frame++) diagnostics.record(frame * 16, 1);
  expect(diagnostics.snapshot(renderer).samples).toBe(0);
  diagnostics.record(1120, 3); // A 400 ms stall is evidence, never filtered out.
  expect(diagnostics.snapshot(renderer)).toMatchObject({ samples: 1, p95FrameMs: 400, stallsOver250Ms: 1 });
  diagnostics.reset();
  diagnostics.record(2000, 1);
  diagnostics.record(2016, 1);
  diagnostics.recordAcknowledgement(12);
  expect(diagnostics.snapshot(renderer)).toMatchObject({ samples: 1, medianFrameMs: 16, commitToFrame: { samples: 1, p95Ms: 12 } });
});
