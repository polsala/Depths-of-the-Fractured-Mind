import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { PNG } from "pngjs";

const base = "source-assets/characters/phase01b/presence";
const contract = JSON.parse(await readFile("src/assets/presence-atlas-contract.json"));
const check = process.argv.includes("--check");
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const report = { contractVersion: contract.version, method: "fixed bottom-center whole-cell premultiplied area sampling; alpha>=128 coverage, binary output; intentional bottom forearm cuts", characters: {} };
async function output(path, bytes) {
  if (check) { if (!(await readFile(path)).equals(bytes)) throw new Error(`Stale presence output: ${path}`); }
  else { await mkdir(path.slice(0, path.lastIndexOf("/")), { recursive: true }); await writeFile(path, bytes); }
}
for (const [id, entry] of Object.entries(contract.characters)) {
  const sourceBytes = await readFile(`${base}/${entry.source}`);
  const source = PNG.sync.read(sourceBytes);
  const atlas = new PNG({ width: contract.width, height: contract.height });
  const sourceWidth = source.width / contract.columns;
  const sourceHeight = source.height / contract.rows;
  const scale = contract.frameWidth / sourceWidth * contract.contentScale;
  const frames = [];
  for (let frame = 0; frame < contract.poses.length; frame++) {
    const col = frame % contract.columns, row = Math.floor(frame / contract.columns);
    const left = Math.round(col * sourceWidth), top = Math.round(row * sourceHeight);
    const right = Math.round((col + 1) * sourceWidth), bottom = Math.round((row + 1) * sourceHeight);
    const cell = new PNG({ width: contract.frameWidth, height: contract.frameHeight });
    const bounds = [256, 256, 0, 0]; let pixels = 0;
    const rootX = (right - left) / 2, rootY = bottom - top + entry.sourceRowRootOffsets[row];
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
      const sx0 = (x - 128) / scale + rootX, sy0 = (y - 256) / scale + rootY;
      const sx1 = sx0 + 1 / scale, sy1 = sy0 + 1 / scale;
      let coverage = 0, red = 0, green = 0, blue = 0;
      for (let sy = Math.max(contract.sourceTopGuardPixels, Math.floor(sy0)); sy < Math.min(rootY, Math.ceil(sy1)); sy++) {
        for (let sx = Math.max(0, Math.floor(sx0)); sx < Math.min(right - left, Math.ceil(sx1)); sx++) {
          const i = ((top + sy) * source.width + left + sx) * 4;
          if (source.data[i + 3] < 128) continue;
          const area = Math.max(0, Math.min(sx + 1, sx1) - Math.max(sx, sx0)) * Math.max(0, Math.min(sy + 1, sy1) - Math.max(sy, sy0));
          coverage += area; red += source.data[i] * area; green += source.data[i + 1] * area; blue += source.data[i + 2] * area;
        }
      }
      if (coverage * scale * scale < 0.5) continue;
      const i = (y * 256 + x) * 4;
      cell.data[i] = Math.round(red / coverage); cell.data[i + 1] = Math.round(green / coverage);
      cell.data[i + 2] = Math.round(blue / coverage); cell.data[i + 3] = 255;
      bounds[0] = Math.min(bounds[0], x); bounds[1] = Math.min(bounds[1], y);
      bounds[2] = Math.max(bounds[2], x + 1); bounds[3] = Math.max(bounds[3], y + 1); pixels++;
    }
    if (pixels < 1000 || bounds[1] < 70 || bounds[3] < 250) throw new Error(`${id}/${frame}: invalid hand/forearm frame: ${pixels}px, bounds ${bounds}`);
    const sha256 = hash(cell.data);
    if (frames.some((prior) => prior.sha256 === sha256)) throw new Error(`${id}/${frame}: duplicate key pose`);
    PNG.bitblt(cell, atlas, 0, 0, 256, 256, col * 256, row * 256);
    frames.push({ frame, pose: contract.poses[frame], sourceCell: [left, top, right, bottom], sourceRoot: [rootX, rootY], root: [128, 256], bounds, pixels, sha256 });
  }
  const bytes = PNG.sync.write(atlas);
  await output(`public/assets/sprites/characters/${entry.atlas}`, bytes);
  report.characters[id] = { source: `${base}/${entry.source}`, sourceSha256: hash(sourceBytes), scale, outputSha256: hash(bytes), frames };
  console.log(`${id}: 8 distinct fixed-scale RGBA hand poses`);
}
await output("public/assets/sprites/characters/phase01b-presence-build.json", Buffer.from(JSON.stringify(report, null, 2) + "\n"));
