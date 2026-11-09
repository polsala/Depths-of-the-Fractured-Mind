# Documentation

## Overhaul production contract

- [Progress and next action](overhaul/PROGRESS.md)
- [Verified baseline and evidence](overhaul/BASELINE_AUDIT.md)
- [Creative vision](overhaul/CREATIVE_VISION.md) · [Art direction](overhaul/ART_DIRECTION.md)
- [Technical architecture](overhaul/TECHNICAL_ARCHITECTURE.md) · [Quality gates](overhaul/QUALITY_GATES.md)
- [Production roadmap and Depth-1 slice](overhaul/PRODUCTION_ROADMAP.md)
- [Asset provenance ledger](overhaul/ASSET_PROVENANCE.json)

## System Docs
- **[SYSTEMS_OVERVIEW.md](SYSTEMS_OVERVIEW.md)** — Cross-system map: exploration, maps, rendering, combat, inventory/economy, events, and debug tooling.
- **[design.md](design.md)** — Full game design spec (fiction, systems, UX, tone).
- **Rendering/Assets:** See SYSTEMS_OVERVIEW for renderer notes; textures in `public/assets/textures/**`.

## Event System
- **[EVENT_SYSTEM.md](EVENT_SYSTEM.md)** — Architecture, lifecycle, authoring guidance.
- **[event-system-quickstart.md](event-system-quickstart.md)** — Fast start for adding events.
- **[EVENT_TROUBLESHOOTING.md](EVENT_TROUBLESHOOTING.md)** — Debugging checklist and fixes.
- Data: `public/data/events.json`; validation: `npm run validate:events`; manual test: `test-events.html`.

## CI/CD & Deployment
- **[ci-cd.md](ci-cd.md)** / **[CI_IMPLEMENTATION.md](CI_IMPLEMENTATION.md)** — Workflow details.
- **[deployment.md](deployment.md)** / **[github-pages-setup.md](github-pages-setup.md)** — Hosting and Pages setup.
