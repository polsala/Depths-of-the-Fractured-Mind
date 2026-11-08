import { execFileSync } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const { webp } = JSON.parse(await readFile(resolve(root, "utils/web-assets.json"), "utf8"));
for (const relative of webp) {
  const original = resolve(root, "source-assets", relative.replace(/\.webp$/, ".png"));
  const output = resolve(root, "public", relative);
  await mkdir(dirname(output), { recursive: true });
  execFileSync("cwebp", ["-quiet", "-q", "90", "-m", "6", "-alpha_q", "100", original, "-o", output]);
  process.stdout.write(`${relative}\n`);
}
const icon = resolve(root, "public/assets/ui/icons/icon.png");
await mkdir(dirname(icon), { recursive: true });
execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i",
  resolve(root, "source-assets/assets/ui/icons/icon.png"), "-vf", "scale=64:64:flags=lanczos", icon]);
process.stdout.write("assets/ui/icons/icon.png (64×64 favicon)\n");
