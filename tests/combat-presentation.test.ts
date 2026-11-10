import { describe, expect, it } from "vitest";
import { COMBAT_CONTACT_MS, COMBAT_PRESENTATION_MS, COMBAT_RECOVERY_MS, sampleCombatPresentation } from "../src/graphics/combat-presentation";

describe("combat presentation synchronization", () => {
  it("retains anticipation until contact, then starts defender reaction time at zero", () => {
    expect(sampleCombatPresentation(1000, 1000)).toMatchObject({ active: true, contact: false, phase: "anticipation", responseElapsedMs: 0 });
    expect(sampleCombatPresentation(1000, 1000 + COMBAT_CONTACT_MS - 1)).toMatchObject({ contact: false, phase: "anticipation" });
    expect(sampleCombatPresentation(1000, 1000 + COMBAT_CONTACT_MS)).toMatchObject({ contact: true, phase: "contact", responseElapsedMs: 0 });
    expect(sampleCombatPresentation(1000, 1000 + COMBAT_CONTACT_MS + 120)).toMatchObject({ contact: true, responseElapsedMs: 120 });
    expect(sampleCombatPresentation(1000, 1000 + COMBAT_RECOVERY_MS)).toMatchObject({ phase: "recovery" });
  });

  it("settles exactly at the feedback boundary and rejects absent, future or invalid cues", () => {
    expect(sampleCombatPresentation(1000, 1000 + COMBAT_PRESENTATION_MS - 1).active).toBe(true);
    expect(sampleCombatPresentation(1000, 1000 + COMBAT_PRESENTATION_MS)).toMatchObject({ active: false, contact: false, elapsedMs: 0, phase: "rest" });
    for (const [start, now] of [[undefined, 1000], [1001, 1000], [NaN, 1000], [1000, Infinity]] as const) {
      expect(sampleCombatPresentation(start, now)).toMatchObject({ active: false, contact: false, responseElapsedMs: 0 });
    }
  });
});
