import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { PNG } from "pngjs";

const base = "source-assets/characters/phase01a";
const contract = JSON.parse(await readFile("src/assets/character-atlas-contract.json"));
const registration = JSON.parse(await readFile(`${base}/registration.json`));
const check = process.argv.includes("--check");
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const report = { contractVersion: contract.version, method: `fixed-scale registered premultiplied area sampling on a ${128 / contract.logicalPixelScale}x${160 / contract.logicalPixelScale} logical grid; native alpha threshold 128, binary runtime coverage`, characters: {} };

async function output(path, bytes) {
  if (check) {
    if (!(await readFile(path)).equals(bytes)) throw new Error(`Stale character output: ${path}`);
  } else { await mkdir(path.slice(0, path.lastIndexOf("/")), { recursive: true }); await writeFile(path, bytes); }
}

for (const [id, entry] of Object.entries(registration.characters)) {
  const sourceBytes = await readFile(`${base}/${entry.source}`);
  const source = PNG.sync.read(sourceBytes);
  const atlas = new PNG({ width: contract.width, height: contract.height });
  const scale = contract.standingPixels / entry.standingHeight;
  const frames = [];
  for (let frame = 0; frame < 16; frame++) {
    const col = frame % 4, row = Math.floor(frame / 4);
    const left = Math.round(col * source.width / 4), top = Math.round(row * source.height / 4);
    const right = Math.round((col + 1) * source.width / 4), bottom = Math.round((row + 1) * source.height / 4);
    const rootX = (right - left) / 2, rootY = entry.groundY[frame];
    const cell = new PNG({ width: 128, height: 160 });
    const bounds = [128, 160, 0, 0]; let pixels = 0;
    const step = contract.logicalPixelScale;
    for (let y = 0; y < 160; y += step) for (let x = 0; x < 128; x += step) {
      const sx0 = (x - registration.outputRoot[0]) / scale + rootX;
      const sy0 = (y - registration.outputRoot[1]) / scale + rootY;
      const sx1 = sx0 + step / scale, sy1 = sy0 + step / scale;
      let coverage = 0, red = 0, green = 0, blue = 0;
      for (let sy = Math.max(0, Math.floor(sy0)); sy < Math.min(bottom - top, Math.ceil(sy1)); sy++) {
        for (let sx = Math.max(0, Math.floor(sx0)); sx < Math.min(right - left, Math.ceil(sx1)); sx++) {
          const i = ((top + sy) * source.width + left + sx) * 4;
          if (source.data[i + 3] < 128) continue;
          const area = Math.max(0, Math.min(sx + 1, sx1) - Math.max(sx, sx0)) * Math.max(0, Math.min(sy + 1, sy1) - Math.max(sy, sy0));
          coverage += area; red += source.data[i] * area; green += source.data[i + 1] * area; blue += source.data[i + 2] * area;
        }
      }
      if (coverage * scale * scale / (step * step) < 0.5) continue;
      for (let dy = 0; dy < step; dy++) for (let dx = 0; dx < step; dx++) {
        const i = ((y + dy) * 128 + x + dx) * 4;
        cell.data[i] = Math.round(red / coverage); cell.data[i + 1] = Math.round(green / coverage);
        cell.data[i + 2] = Math.round(blue / coverage); cell.data[i + 3] = 255;
      }
      bounds[0] = Math.min(bounds[0], x); bounds[1] = Math.min(bounds[1], y);
      bounds[2] = Math.max(bounds[2], x + step); bounds[3] = Math.max(bounds[3], y + step); pixels += step * step;
    }
    if (pixels < 1800) throw new Error(`${id}/${frame}: empty or incomplete silhouette`);
    if (bounds[0] < 1 || bounds[1] < 2 || bounds[2] > 127 || bounds[3] > 149) throw new Error(`${id}/${frame}: clipped frame ${bounds}`);
    const sha256 = hash(cell.data);
    if (frames.some((prior) => prior.sha256 === sha256)) throw new Error(`${id}/${frame}: duplicated pose`);
    PNG.bitblt(cell, atlas, 0, 0, 128, 160, col * 128, row * 160);
    frames.push({ frame, sourceCell: [left, top, right, bottom], sourceRoot: [rootX, rootY], bounds, pixels, sha256 });
    if (frame === 0) await output(`public/assets/sprites/characters/${contract.characters[id].idle}`, PNG.sync.write(cell));
  }
  const bytes = PNG.sync.write(atlas);
  await output(`public/assets/sprites/characters/${contract.characters[id].atlas}`, bytes);
  report.characters[id] = { source: `${base}/${entry.source}`, sourceSha256: hash(sourceBytes), scale, outputSha256: hash(bytes), frames };
  console.log(`${id}: 16 distinct registered RGBA poses, fixed scale ${scale.toFixed(6)}`);
}
await output("public/assets/sprites/characters/phase01a-build.json", Buffer.from(JSON.stringify(report, null, 2) + "\n"));
