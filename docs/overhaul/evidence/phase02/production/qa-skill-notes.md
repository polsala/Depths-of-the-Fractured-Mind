# QA skill use

Read actual installed files:
- `/home/psala/.agents/skills/threejs-qa-release/SKILL.md`
- `/home/psala/.agents/skills/threejs-qa-release/references/visual-test-harness.md`
- `/home/psala/.agents/skills/threejs-qa-release/references/release-checks.md`
- `/home/psala/.agents/skills/game-feel/SKILL.md`
- `/home/psala/.agents/skills/game-ui-ux/SKILL.md`

Decisions: extend existing Playwright production preview with an actual Begin-button journey; seed pinned only at entropy source without QA hooks. Separate isolated visual fixtures from story/progression proof. Capture real connected-room input with unpaused camera and inherited presence. Check one active world renderer/presence, context-loss fallback, reduced motion, all four real portrait UI selections, finite rewards, DOM overflow and save/RNG passivity. Preserve no-bob presentation contract over generic shake recommendations. Capture complete 10-role room set in both required DPR1 viewports with full and reduced motion, source/build hashes and GPU diagnostics. Visual harness explicitly records fixture kind and does not infer artistic quality from pixel diversity.

Implementation: `tests/archive-journey.spec.ts`, `tests/archive-presence.spec.ts`, `tests/phase02-browser.ts`, `playwright.config.ts`, Archive-only branches in `src/ui/app.ts` QA hook, `utils/capture-archive.mjs`.
