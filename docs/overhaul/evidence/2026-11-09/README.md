# Phase-00 evidence bundle

Audit source HEAD: `48d713e1717b7764b4fa2e59c0c1278866627252`. Generated locally on 2026-11-09. This directory is a preserved milestone snapshot; routine reruns go to ignored `artifacts/baseline/`.

`report.json` contains environment, source/lock/fixture hashes, settings, scene locations, cold encoded network bytes, sampled heap, WebGL2 capability/renderer and all console/network diagnostics. `comparison.json` records a second fresh-context run: all 13 PNGs have zero changed pixels on this host/browser. Only the first image set is duplicated here; the repeat image set remains in local artifacts and can be reproduced.

Each of title, first-room, corridor, combat, inventory-party and mobile has a full-page PNG and a `-viewport.png`. `party.png` is a native Canvas crop. All were directly inspected; defects remain deliberately visible. `corridor-checkpoint.json` is a camera-only derived v1 checkpoint, and the report records a reachable map route. These images do not prove an unassisted player journey or visual approval. Screenshots inherit the unresolved provenance of depicted legacy media; this bundle is local production evidence, not cleared marketing material.

`tracked-tree.txt` inventories the original repository. `source-symbols.txt` indexes inspected execution boundaries; it is a navigation aid, not a line-by-line correctness certification. The text logs retain the original build/smoke/benchmarks, original and expanded unit results, registry security audit, capture and expected failing release-rights check. `npm-test-sandbox.txt` intentionally preserves the initial environment-restricted failure; `unit-original.txt` shows those unmodified tests passing outside the sandbox.

Reproduce:

```sh
npm ci
npx playwright install chromium-headless-shell
npm test
npm run test:smoke
npm run assets:provenance
npm run baseline:capture
BASELINE_OUTPUT=artifacts/baseline/repeat npm run baseline:capture
node utils/compare-baseline.mjs artifacts/baseline/latest artifacts/baseline/repeat
npm run bench:load
npm run bench:combat
```

Local server/browser commands require suitable OS/sandbox permissions. Use the pinned browser for comparison. Physical-device, human-play, listening and file-specific rights evidence are still required by [the quality gates](../../QUALITY_GATES.md).
