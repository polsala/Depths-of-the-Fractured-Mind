export interface Preferences {
  music: number;
  sfx: number;
  motion: "system" | "reduced" | "full";
  textScale: number;
  quality: "low" | "balanced" | "high";
}

const KEY = "depths-of-the-fractured-mind.preferences.v1";
const DEFAULTS: Preferences = { music: 70, sfx: 80, motion: "system", textScale: 100, quality: "balanced" };

export function readPreferences(): Preferences {
  if (typeof localStorage === "undefined") return { ...DEFAULTS };
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<Preferences> | null;
    if (!saved || typeof saved !== "object") return { ...DEFAULTS };
    return {
      music: validPercent(saved.music, DEFAULTS.music),
      sfx: validPercent(saved.sfx, DEFAULTS.sfx),
      motion: ["system", "reduced", "full"].includes(saved.motion ?? "") ? saved.motion! : "system",
      textScale: [100, 125, 150, 200].includes(saved.textScale ?? 0) ? saved.textScale! : 100,
      quality: ["low", "balanced", "high"].includes(saved.quality ?? "") ? saved.quality! : "balanced",
    };
  } catch { return { ...DEFAULTS }; }
}

function validPercent(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : fallback;
}

export function updatePreferences(patch: Partial<Preferences>): Preferences {
  const next = { ...readPreferences(), ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* Private mode may disallow storage. */ }
  return next;
}
