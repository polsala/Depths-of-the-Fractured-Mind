import { readFile, readdir, stat } from "node:fs/promises";
import { resolve, relative } from "node:path";
import { PNG } from "pngjs";

const root = resolve(import.meta.dirname, "..");
const publicDir = resolve(root, "public");
const distDir = resolve(root, "dist");
const { webp } = JSON.parse(await readFile(resolve(root, "utils/web-assets.json"), "utf8"));
for (const path of webp) {
  for (const dir of [publicDir, distDir]) {
    const bytes = await readFile(resolve(dir, path));
    if (bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WEBP") {
      throw new Error(`Invalid or missing WebP: ${relative(root, resolve(dir, path))}`);
    }
  }
}
const icon = PNG.sync.read(await readFile(resolve(publicDir, "assets/ui/icons/icon.png")));
if (icon.width !== 64 || icon.height !== 64) throw new Error("Favicon must be 64×64");

async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map(async (entry) => {
    const path = resolve(dir, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  }))).flat();
}
const distFiles = await files(distDir);
const bytes = (await Promise.all(distFiles.map((path) => stat(path)))).reduce((total, info) => total + info.size, 0);
const budget = 45 * 1024 * 1024;
if (bytes > budget) throw new Error(`dist ${bytes} bytes exceeds ${budget} byte budget`);
const stale = distFiles.map((path) => relative(distDir, path)).filter((path) =>
  /CHAR_00\d\.png$|events\.json\.backup$|boss_bg1\.png$|vite\.svg$|assets\/(textures|tilesets|backgrounds|sprites\/objects)\/.*\.png$/.test(path));
if (stale.length) throw new Error(`Unused source files in dist: ${stale.join(", ")}`);
process.stdout.write(`Asset budget passed: ${(bytes / 1048576).toFixed(1)} MiB / 45 MiB; ${webp.length} WebP files\n`);
