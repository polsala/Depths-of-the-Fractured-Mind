/** Shared presentation clock only. Domain outcomes and DOM results commit immediately. */
export const COMBAT_PRESENTATION_MS = 650;
export const COMBAT_CONTACT_MS = 143;
export const COMBAT_RECOVERY_MS = 403;

export function sampleCombatPresentation(startedAt: number | undefined, now: number) {
  const elapsedMs = startedAt !== undefined && Number.isFinite(startedAt) && Number.isFinite(now)
    ? now - startedAt : -1;
  const active = elapsedMs >= 0 && elapsedMs < COMBAT_PRESENTATION_MS;
  const contact = active && elapsedMs >= COMBAT_CONTACT_MS;
  return {
    active,
    contact,
    elapsedMs: active ? elapsedMs : 0,
    responseElapsedMs: contact ? elapsedMs - COMBAT_CONTACT_MS : 0,
    phase: !active ? "rest" : elapsedMs < COMBAT_CONTACT_MS ? "anticipation"
      : elapsedMs < COMBAT_RECOVERY_MS ? "contact" : "recovery",
  } as const;
}
