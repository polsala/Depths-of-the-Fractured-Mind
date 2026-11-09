import { readFile, readdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { PNG } from "pngjs";

const [reference, candidate] = process.argv.slice(2);
if (!reference || !candidate) throw new Error("Usage: node utils/compare-baseline.mjs reference-directory candidate-directory");
const results = [];
const names = (await readdir(reference)).filter((name) => name.endsWith(".png")).sort();
const candidateNames = (await readdir(candidate)).filter((name) => name.endsWith(".png")).sort();
if (!names.length || JSON.stringify(names) !== JSON.stringify(candidateNames)) throw new Error("Screenshot sets are empty or incomplete");
for (const name of names) {
  const before = PNG.sync.read(await readFile(join(reference, name)));
  const after = PNG.sync.read(await readFile(join(candidate, name)));
  let changedPixels = 0;
  const equalSize = before.width === after.width && before.height === after.height;
  if (equalSize) for (let index = 0; index < before.data.length; index += 4) {
    if ([0, 1, 2, 3].some((channel) => before.data[index + channel] !== after.data[index + channel])) changedPixels++;
  }
  results.push({ name, equalSize, changedPixels: equalSize ? changedPixels : null,
    changedPercent: equalSize ? +(100 * changedPixels / (before.width * before.height)).toFixed(5) : null });
}
const report = { reference: resolve(reference), candidate: resolve(candidate), tolerance: "zero pixels; same browser and host", results };
await writeFile(join(candidate, "comparison.json"), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
if (results.some((result) => !result.equalSize || result.changedPixels)) process.exitCode = 1;
