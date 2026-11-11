// Original image source -> small repeatable runtime materials. No gameplay RNG.
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { PNG } from "pngjs";

const sourceDir = "source-assets/environments/archive-phase02a";
const runtimeDir = "public/assets/textures/archive-phase02a";
const sourcePath = `${sourceDir}/material-master.png`;
const raw = await readFile(sourcePath), source = PNG.sync.read(raw);
const size = 256, panelWidth = source.width / 3, panelHeight = source.height / 2;
if (!Number.isInteger(panelWidth) || !Number.isInteger(panelHeight)) throw new Error("Material source must have an exact 3×2 layout");
await mkdir(runtimeDir, { recursive: true });
const names = ["concrete", "enamel", "linoleum", "service", "steel", "paper"];
const files = [];
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)));
for (const [index, name] of names.entries()) {
  const values = new Float64Array(size * size);
  // Inset the generative grid, then area sample. Framing is deterministic and
  // does not trust a model to provide exact final dimensions or seamlessness.
  const inset = .045, width = panelWidth * (1 - 2 * inset), height = panelHeight * (1 - 2 * inset);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let value = 0;
    for (let sy = 0; sy < 3; sy++) for (let sx = 0; sx < 3; sx++) {
      const px = Math.min(source.width - 1, Math.floor((index % 3) * panelWidth + inset * panelWidth + (x + (sx + .5) / 3) * width / size));
      const py = Math.min(source.height - 1, Math.floor(Math.floor(index / 3) * panelHeight + inset * panelHeight + (y + (sy + .5) / 3) * height / size));
      const offset = (py * source.width + px) * 4;
      value += source.data[offset] * .2126 + source.data[offset + 1] * .7152 + source.data[offset + 2] * .0722;
    }
    values[y * size + x] = value / 9;
  }
  // Match opposing edge pixels through a 16px feather; corners are repaired by
  // the second pass. This avoids a bright/dark seam without mirroring the art.
  for (const horizontal of [true, false]) for (let line = 0; line < size; line++) for (let edge = 0; edge < 16; edge++) {
    const a = horizontal ? line * size + edge : edge * size + line;
    const b = horizontal ? line * size + size - 1 - edge : (size - 1 - edge) * size + line;
    const weight = (1 - edge / 16) ** 2, average = (values[a] + values[b]) / 2;
    values[a] += (average - values[a]) * weight; values[b] += (average - values[b]) * weight;
  }
  const sorted = [...values].sort((a, b) => a - b), low = sorted[Math.floor(sorted.length * .02)], high = sorted[Math.floor(sorted.length * .98)];
  const contrast = { concrete: 29, enamel: 20, linoleum: 18, service: 24, steel: 23, paper: 14 }[name];
  const normalized = Array.from(values, value => Math.max(-1, Math.min(1, (value - (low + high) / 2) / Math.max(1, (high - low) / 2))));
  const color = new PNG({ width: size, height: size });
  const detail = new PNG({ width: size, height: size });
  for (let pixel = 0; pixel < normalized.length; pixel++) {
    const variation = normalized[pixel], offset = pixel * 4;
    const gray = clamp(215 + variation * contrast);
    color.data[offset] = color.data[offset + 1] = color.data[offset + 2] = gray; color.data[offset + 3] = 255;
    // R: restrained height. G: material-specific roughness. Data is linear.
    detail.data[offset] = clamp(128 + variation * 26);
    detail.data[offset + 1] = clamp(({ concrete: 232, enamel: 197, linoleum: 210, service: 234, steel: 188, paper: 245 }[name]) + variation * 9);
    detail.data[offset + 2] = 0; detail.data[offset + 3] = 255;
  }
  for (const [suffix, png] of [["color", color], ["detail", detail]]) {
    const sourceDerivative = `${sourceDir}/${name}-${suffix}.png`, output = `${runtimeDir}/${name}-${suffix}.webp`;
    const bytes = PNG.sync.write(png); await writeFile(sourceDerivative, bytes);
    execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", sourceDerivative, "-c:v", "libwebp", "-lossless", "1", "-compression_level", "6", output]);
    files.push({ name, type: suffix, source: sourceDerivative, sourceSha256: sha(bytes), path: output,
      sha256: sha(await readFile(output)), bytes: (await stat(output)).size, width: size, height: size,
      colorSpace: suffix === "color" ? "srgb" : "linear", metresPerRepeat: 2 });
  }
}
const manifest = { schemaVersion: 1, source: sourcePath, sourceSha256: sha(raw), sourceWidth: source.width, sourceHeight: source.height,
  method: "3×2 source crop; 3×3 area sampling; 16px opposing-edge repair; percentile neutralization; 256×256 lossless WebP; linear packed height/roughness data",
  runtimeBytes: files.reduce((sum, file) => sum + file.bytes, 0), decodedBytes: files.length * size * size * 4, files };
await writeFile(`${sourceDir}/build-manifest.json`, JSON.stringify(manifest, null, 2) + "\n");
console.log(JSON.stringify(manifest, null, 2));
