import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const root = resolve(import.meta.dirname, '..');
const contract = JSON.parse(await readFile(resolve(root, 'src/assets/hero-atlas-contract.json'), 'utf8'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const check = process.argv.includes('--check');
if (contract.version !== 2 || contract.columns !== 4 || contract.rows !== 4 || contract.width !== 512 || contract.height !== 640 || contract.frameWidth !== 128 || contract.frameHeight !== 160) throw new Error('Unsupported hero atlas contract');
for (const [name, clip] of Object.entries(contract.animations)) {
  if (!clip.frames.length || clip.frames.length !== clip.durations.length || clip.durations.some(ms => !Number.isInteger(ms) || ms < 60)) throw new Error(`Invalid ${name} animation timing`);
  if (clip.frames.some(index => !Number.isInteger(index) || index < 0 || index >= 16)) throw new Error(`Invalid ${name} animation frame`);
}

/** Native alpha/grid/pivot gate, shared by production build and unit tests. */
export function validateFrames(name, image) {
  if (image.width !== contract.width || image.height !== contract.height) throw new Error(`${name}: wrong dimensions`);
  let transparent = 0;
  for (let i = 3; i < image.data.length; i += 4) {
    if (image.data[i] === 0) transparent++;
    else if (image.data[i] !== 255) throw new Error(`${name}: nonbinary runtime alpha`);
  }
  if (transparent < image.width * image.height * 0.45) throw new Error(`${name}: missing true transparency`);
  const hashes = new Set();
  for (let frame = 0; frame < 16; frame++) {
    const cell = new PNG({ width: 128, height: 160 });
    PNG.bitblt(image, cell, frame % 4 * 128, Math.floor(frame / 4) * 160, 128, 160, 0, 0);
    let pixels = 0; const bounds = [128, 160, 0, 0];
    for (let y = 0; y < 160; y++) for (let x = 0; x < 128; x++) if (cell.data[(y * 128 + x) * 4 + 3]) {
      pixels++; bounds[0] = Math.min(bounds[0], x); bounds[1] = Math.min(bounds[1], y);
      bounds[2] = Math.max(bounds[2], x + 1); bounds[3] = Math.max(bounds[3], y + 1);
    }
    if (pixels < 1500) throw new Error(`${name}: missing or empty frame ${frame}`);
    if (bounds[0] < 1 || bounds[1] < 2 || bounds[2] > 127 || bounds[3] > 149) throw new Error(`${name}: clipped frame ${frame}: ${bounds}`);
    if (frame < 2 && Math.abs(bounds[3] - 147) > 1) throw new Error(`${name}: idle contact drift ${frame}`);
    const sha = hash(cell.data);
    if (hashes.has(sha)) throw new Error(`${name}: duplicated pose ${frame}`);
    hashes.add(sha);
  }
}
async function output(path, bytes) {
  const target = resolve(root, path);
  if (check) {
    if (!(await readFile(target)).equals(bytes)) throw new Error(`Stale hero output: ${path}; run npm run sprites:build`);
  } else { await mkdir(dirname(target), { recursive: true }); await writeFile(target, bytes); }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const registration = JSON.parse(await readFile(resolve(root, `${contract.sourceBase}/registration.json`)));
  const report = { contractVersion: contract.version, method: 'fixed-scale registered premultiplied area sampling; source alpha >=128; binary runtime coverage >=0.5; no component deletion or pose resizing', characters: {} };
  const atlases = [];
  for (const [id, entry] of Object.entries(registration.characters)) {
    const sourceBytes = await readFile(resolve(root, `${contract.sourceBase}/${entry.source}`));
    const source = PNG.sync.read(sourceBytes);
    const atlas = new PNG({ width: contract.width, height: contract.height });
    const scale = contract.standingPixels / entry.standingHeight;
    const frames = [];
    for (let frame = 0; frame < 16; frame++) {
      const col = frame % 4, row = Math.floor(frame / 4);
      const left = Math.round(col * source.width / 4), top = Math.round(row * source.height / 4);
      const right = Math.round((col + 1) * source.width / 4), bottom = Math.round((row + 1) * source.height / 4);
      const rootX = entry.rootX, rootY = entry.groundY[frame];
      const cell = new PNG({ width: 128, height: 160 });
      const bounds = [128, 160, 0, 0]; let pixels = 0;
      for (let y = 0; y < 160; y++) for (let x = 0; x < 128; x++) {
        const sx0 = (x - registration.outputRoot[0]) / scale + rootX;
        const sy0 = (y - registration.outputRoot[1]) / scale + rootY;
        const sx1 = sx0 + 1 / scale, sy1 = sy0 + 1 / scale;
        let coverage = 0, red = 0, green = 0, blue = 0;
        for (let sy = Math.max(0, Math.floor(sy0)); sy < Math.min(bottom - top, Math.ceil(sy1)); sy++) {
          for (let sx = Math.max(0, Math.floor(sx0)); sx < Math.min(right - left, Math.ceil(sx1)); sx++) {
            const i = ((top + sy) * source.width + left + sx) * 4;
            if (source.data[i + 3] < 128) continue;
            const area = Math.max(0, Math.min(sx + 1, sx1) - Math.max(sx, sx0)) * Math.max(0, Math.min(sy + 1, sy1) - Math.max(sy, sy0));
            coverage += area; red += source.data[i] * area; green += source.data[i + 1] * area; blue += source.data[i + 2] * area;
          }
        }
        if (coverage * scale * scale < 0.5) continue;
        const i = (y * 128 + x) * 4;
        cell.data[i] = Math.round(red / coverage); cell.data[i + 1] = Math.round(green / coverage);
        cell.data[i + 2] = Math.round(blue / coverage); cell.data[i + 3] = 255;
        bounds[0] = Math.min(bounds[0], x); bounds[1] = Math.min(bounds[1], y);
        bounds[2] = Math.max(bounds[2], x + 1); bounds[3] = Math.max(bounds[3], y + 1); pixels++;
      }
      PNG.bitblt(cell, atlas, 0, 0, 128, 160, col * 128, row * 160);
      frames.push({ frame, sourceCell: [left, top, right, bottom], sourceRoot: [rootX, rootY], bounds, pixels, sha256: hash(cell.data) });
    }
    validateFrames(id, atlas);
    const bytes = PNG.sync.write(atlas);
    await output(`public/assets/sprites/characters/${contract.characters[id].atlas}`, bytes);
    report.characters[id] = { source: `${contract.sourceBase}/${entry.source}`, sourceSha256: hash(sourceBytes), scale, outputSha256: hash(bytes), frames };
    atlases.push(atlas);
    console.log(`${id}: 16 distinct registered RGBA poses, fixed scale ${scale.toFixed(6)}`);
  }
  await output('public/assets/sprites/characters/phase01b-heroes-build.json', Buffer.from(JSON.stringify(report, null, 2) + '\n'));
  const sample = new PNG({ width: 640, height: 800 });
  for (let i = 0; i < sample.data.length; i += 4) { sample.data[i] = 18; sample.data[i + 1] = 27; sample.data[i + 2] = 35; sample.data[i + 3] = 255; }
  for (const [column, atlas] of atlases.entries()) for (const [row, frame] of [0, 4, 7, 15].entries()) {
    const sx = frame % 4 * 128, sy = Math.floor(frame / 4) * 160;
    const left = column * 160 + 16, top = row * 200 + 20;
    for (let y = 0; y < 160; y++) for (let x = 0; x < 128; x++) {
      const sourceIndex = ((sy + y) * atlas.width + sx + x) * 4, targetIndex = ((top + y) * sample.width + left + x) * 4;
      if (!atlas.data[sourceIndex + 3]) continue;
      for (let c = 0; c < 3; c++) sample.data[targetIndex + c] = atlas.data[sourceIndex + c];
    }
  }
  await output('docs/art/hero-reference-phase01b.png', PNG.sync.write(sample));
}
