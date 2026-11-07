import { ENEMIES } from "../game/enemies";

type Pose = "idle" | "attack" | "hit" | "death";
interface EnemyArt {
  silhouette: string;
  detail: string;
  fill: string;
  accent: string;
  hitbox: { x: number; y: number; width: number; height: number };
  pivot: { x: number; y: number };
}

// Vector silhouettes are intentionally authored per creature. Coordinates are
// normalized to a 100×100 atlas cell; the pivot is at the feet/anchor point.
const art: Record<keyof typeof ENEMIES, Omit<EnemyArt, "hitbox" | "pivot">> = {
  deranged_guard: {
    silhouette: "M37 88 L37 67 L32 64 L28 87 L20 87 L22 53 L33 40 L40 37 L39 24 Q42 16 50 16 Q59 17 61 25 L60 37 L68 40 L76 53 L80 87 L72 87 L68 64 L63 67 L63 88 L54 88 L51 71 L47 71 L46 88 Z",
    detail: "M38 24 Q50 18 62 25 L60 32 L39 32 Z M35 41 L65 41 M37 51 L63 51 M39 61 L61 61 M28 50 L17 80 M73 51 L88 82 M44 68 L56 68",
    fill: "#536978", accent: "#f2a65a",
  },
  corrupted_rat: {
    silhouette: "M16 74 Q14 61 29 55 L30 41 L21 27 L37 36 Q51 29 60 38 L67 24 L73 42 Q84 48 81 64 L91 67 L84 72 L72 70 L65 82 L55 82 L53 74 L34 75 L30 82 L20 82 Z",
    detail: "M20 73 Q5 80 8 56 M62 53 L74 52 M31 47 L42 43 M58 43 L68 47 M69 68 L88 67 M31 73 L26 82 M55 74 L57 81",
    fill: "#867f78", accent: "#cfff6e",
  },
  threshold_warden: {
    silhouette: "M24 91 L20 77 L14 81 L10 56 Q13 40 29 38 L28 27 Q31 14 41 17 L47 30 L52 31 L55 18 Q66 12 71 26 L69 37 Q83 36 88 51 L91 79 L79 81 L77 91 L60 91 L56 72 L44 72 L39 91 Z",
    detail: "M30 24 L43 24 M56 24 L68 24 M33 36 L67 38 M25 50 L74 50 M30 64 L72 64 M37 77 L61 77 M15 58 L25 74 M83 56 L79 72",
    fill: "#626b79", accent: "#ff6e72",
  },
  archivist_wraith: {
    silhouette: "M30 82 Q29 69 27 50 Q27 24 50 16 Q72 23 72 50 L79 84 L65 76 L53 87 L40 76 Z",
    detail: "M33 50 L67 50 M40 37 L45 37 M55 37 L60 37 M33 60 L19 70 M67 60 L82 71 M43 63 L59 63",
    fill: "#8da7b3", accent: "#d6ecf7",
  },
  filing_beast: {
    silhouette: "M22 31 L77 29 L79 84 L21 85 Z M26 27 L73 20 L79 30 Z",
    detail: "M29 41 L70 40 L73 51 L29 52 Z M29 59 L70 58 L75 71 L29 72 Z M40 44 L56 44 M40 63 L56 63 M18 75 L9 83 M82 75 L91 83",
    fill: "#697c7e", accent: "#f1d38b",
  },
  keeper_of_records: {
    silhouette: "M27 85 Q12 51 34 32 L27 14 L49 27 L68 12 L67 31 Q87 52 72 84 Z",
    detail: "M19 45 L34 38 M73 38 L86 31 M34 50 L64 49 M37 60 L65 60 M39 70 L60 69 M45 35 L52 37",
    fill: "#827363", accent: "#f6d7a4",
  },
  patient_husk: {
    silhouette: "M42 17 Q50 8 58 18 L57 35 L65 40 L60 65 L68 88 L54 88 L50 68 L45 88 L32 88 L38 63 L33 39 L42 34 Z",
    detail: "M44 24 L48 24 M53 24 L57 24 M35 45 L24 72 M64 44 L75 71 M41 48 L59 55",
    fill: "#a9aeb0", accent: "#e9a2ac",
  },
  surgery_horror: {
    silhouette: "M39 26 L58 24 L71 41 L66 73 L57 84 L35 78 L27 47 Z M15 29 L30 38 L22 52 Z M72 37 L86 21 L81 51 Z",
    detail: "M43 27 L52 42 L63 25 M36 49 L61 53 M40 64 L55 67 M20 67 L35 60 M68 63 L85 75",
    fill: "#806873", accent: "#f5a7b8",
  },
  ward_physician: {
    silhouette: "M42 16 Q50 7 59 17 L58 35 L70 41 L75 89 L25 89 L30 41 L42 35 Z",
    detail: "M39 25 L60 25 M35 48 L50 68 L65 47 M47 41 L53 41 M64 62 L81 35 M31 66 L19 48",
    fill: "#c7d0d1", accent: "#d25362",
  },
  reflection_twin: {
    silhouette: "M26 87 L33 41 L39 35 L37 21 Q45 11 51 20 L50 38 L62 41 L70 88 Z",
    detail: "M51 18 L51 89 M39 27 L48 27 M54 27 L63 27 M31 52 L21 77 M65 53 L77 72",
    fill: "#8a99ae", accent: "#c8f0ff",
  },
  guilt_manifestation: {
    silhouette: "M17 88 Q15 58 32 44 L27 27 Q41 14 51 27 Q66 10 76 32 L68 46 Q87 64 82 87 Z",
    detail: "M34 42 L45 44 M60 44 L70 41 M30 65 Q50 81 72 62 M42 33 L46 33 M59 31 L64 31",
    fill: "#555267", accent: "#c699d5",
  },
  mirror_self: {
    silhouette: "M50 9 L75 25 L81 70 L50 91 L19 70 L25 25 Z",
    detail: "M50 13 L50 87 M27 29 L73 68 M74 29 L27 69 M36 38 L47 35 M54 35 L65 38",
    fill: "#9bacbd", accent: "#f2f8ff",
  },
  engine_spawn: {
    silhouette: "M39 29 L51 17 L64 29 L70 50 L61 74 L49 88 L36 72 L30 49 Z",
    detail: "M49 17 L50 87 M32 45 L12 36 L8 57 M69 45 L87 31 L91 62 M37 65 L17 82 M63 65 L82 83",
    fill: "#697d79", accent: "#8de3b0",
  },
  amalgam_guardian: {
    silhouette: "M18 91 L15 48 Q25 31 36 35 L35 21 Q46 8 55 20 L54 35 Q78 30 84 49 L81 91 Z",
    detail: "M24 54 L75 54 M32 69 L68 70 M40 24 L45 24 M55 24 L61 24 M10 41 L20 72 M83 46 L93 71",
    fill: "#666d69", accent: "#a5e2c4",
  },
  the_engine_heart: {
    silhouette: "M50 86 Q13 58 23 35 Q31 17 50 34 Q69 17 77 35 Q87 58 50 86 Z",
    detail: "M50 34 L50 78 M31 45 L69 45 M29 57 L70 57 M24 36 L11 16 M76 36 L89 16 M31 70 L16 88 M69 70 L84 88",
    fill: "#9d465b", accent: "#f89b9d",
  },
};

const luminousDetails: Record<string, string> = {
  deranged_guard: "M42 28 L46 28 M54 28 L58 28 M51 44 L57 44 M75 57 L86 80",
  corrupted_rat: "M36 51 L41 50 M61 50 L66 51 M78 64 L82 63",
  threshold_warden: "M34 28 L40 28 M59 28 L65 28 M43 57 L56 57 M35 70 L62 70",
  archivist_wraith: "M39 39 L45 39 M55 39 L61 39 M37 57 L62 57",
  filing_beast: "M43 47 L55 47 M43 66 L55 66 M27 34 L72 31",
  keeper_of_records: "M42 39 L47 39 M55 39 L61 39 M38 58 L63 58",
  patient_husk: "M44 26 L48 26 M54 26 L58 26 M41 53 L58 57",
  surgery_horror: "M44 37 L53 39 M37 57 L60 58 M73 35 L84 22",
  ward_physician: "M42 27 L48 27 M54 27 L60 27 M43 48 L57 48",
  reflection_twin: "M40 27 L46 27 M55 27 L61 27 M52 18 L52 86",
  guilt_manifestation: "M40 34 L45 34 M58 34 L63 34 M41 61 L59 61",
  mirror_self: "M50 14 L50 83 M37 40 L47 37 M54 37 L65 40",
  engine_spawn: "M48 28 L52 28 M43 48 L57 48 M49 57 L49 79",
  amalgam_guardian: "M38 28 L44 28 M56 28 L62 28 M36 53 L63 53",
  the_engine_heart: "M50 36 L50 77 M34 48 L66 48 M32 59 L68 59",
};

const geometry: Record<string, Pick<EnemyArt, "hitbox" | "pivot">> = {
  deranged_guard: { hitbox: { x: 17, y: 16, width: 72, height: 72 }, pivot: { x: 0.5, y: 0.88 } },
  corrupted_rat: { hitbox: { x: 8, y: 24, width: 83, height: 59 }, pivot: { x: 0.5, y: 0.82 } },
  threshold_warden: { hitbox: { x: 10, y: 13, width: 82, height: 78 }, pivot: { x: 0.5, y: 0.91 } },
  archivist_wraith: { hitbox: { x: 19, y: 16, width: 64, height: 72 }, pivot: { x: 0.5, y: 0.87 } },
  filing_beast: { hitbox: { x: 9, y: 20, width: 82, height: 65 }, pivot: { x: 0.5, y: 0.85 } },
  keeper_of_records: { hitbox: { x: 19, y: 12, width: 67, height: 73 }, pivot: { x: 0.5, y: 0.85 } },
  patient_husk: { hitbox: { x: 19, y: 9, width: 58, height: 80 }, pivot: { x: 0.5, y: 0.88 } },
  surgery_horror: { hitbox: { x: 15, y: 21, width: 72, height: 64 }, pivot: { x: 0.5, y: 0.84 } },
  ward_physician: { hitbox: { x: 19, y: 8, width: 63, height: 81 }, pivot: { x: 0.5, y: 0.89 } },
  reflection_twin: { hitbox: { x: 21, y: 11, width: 57, height: 78 }, pivot: { x: 0.5, y: 0.88 } },
  guilt_manifestation: { hitbox: { x: 15, y: 10, width: 73, height: 78 }, pivot: { x: 0.5, y: 0.88 } },
  mirror_self: { hitbox: { x: 19, y: 9, width: 62, height: 82 }, pivot: { x: 0.5, y: 0.91 } },
  engine_spawn: { hitbox: { x: 8, y: 17, width: 84, height: 72 }, pivot: { x: 0.5, y: 0.88 } },
  amalgam_guardian: { hitbox: { x: 9, y: 8, width: 85, height: 83 }, pivot: { x: 0.5, y: 0.91 } },
  the_engine_heart: { hitbox: { x: 11, y: 16, width: 78, height: 73 }, pivot: { x: 0.5, y: 0.86 } },
};

export function enemyArt(id: string): EnemyArt | null {
  const entry = art[id];
  if (!entry || !geometry[id]) return null;
  return { ...entry, ...geometry[id] };
}

export function drawEnemy(ctx: CanvasRenderingContext2D, id: string, pose: Pose,
  elapsedMs: number, x: number, y: number, width: number, height: number,
  reducedMotion = false): boolean {
  const entry = enemyArt(id);
  if (!entry) return false;
  const progress = reducedMotion ? 0 : Math.min(1, Math.max(0, elapsedMs) / 650);
  const bob = pose === "idle" && !reducedMotion ? Math.sin(elapsedMs / 340) * 1.5 : 0;
  const lunge = pose === "attack" ? Math.sin(progress * Math.PI) * 6 : 0;
  const shake = pose === "hit" && !reducedMotion ? Math.sin(progress * Math.PI * 8) * (1 - progress) * 4 : 0;
  ctx.save();
  ctx.translate(x + width * entry.pivot.x + shake, y + height * entry.pivot.y + bob - lunge);
  ctx.scale(width / 100, height / 100);
  ctx.translate(-entry.pivot.x * 100, -entry.pivot.y * 100);
  ctx.fillStyle = "rgba(0, 0, 0, 0.34)";
  ctx.beginPath();
  ctx.ellipse(50, 91, 34, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  if (pose === "death") { ctx.globalAlpha = 0.35; ctx.translate(50, 80); ctx.rotate(-0.35); ctx.translate(-50, -80); }
  ctx.shadowBlur = 13;
  ctx.shadowColor = entry.accent;
  const silhouette = new Path2D(entry.silhouette);
  const fill = ctx.createLinearGradient(15, 12, 85, 90);
  fill.addColorStop(0, entry.accent);
  fill.addColorStop(0.4, entry.fill);
  fill.addColorStop(1, "#191924");
  ctx.fillStyle = fill;
  ctx.fill(silhouette);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = pose === "hit" ? "#fff2dd" : entry.accent;
  ctx.lineWidth = 2;
  ctx.stroke(silhouette);
  ctx.strokeStyle = "rgba(12, 19, 25, 0.85)";
  ctx.lineWidth = 2.5;
  ctx.stroke(new Path2D(entry.detail));
  ctx.shadowBlur = 9;
  ctx.shadowColor = entry.accent;
  ctx.strokeStyle = entry.accent;
  ctx.lineWidth = 1.8;
  ctx.stroke(new Path2D(luminousDetails[id]));
  ctx.restore();
  return true;
}
