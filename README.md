# Depths of the Fractured Mind

A dark, psychological old-school dungeon crawler where a party of four descends into a twisted underground facility, confronting both physical horrors and their own guilt through morally ambiguous choices that shape sanity, relationships, and multiple endings.

## 🎮 Play the Game

The game is deployed and playable at: **https://polsala.github.io/Depths-of-the-Fractured-Mind/**

## 📋 About

Depths of the Fractured Mind is a turn-based psychological horror dungeon crawler built with TypeScript and Vite. Players control a party of four flawed characters as they descend through five depths of an abandoned underground facility, making difficult moral choices that affect sanity, relationships, and ultimately determine one of multiple endings.

### Systems at a Glance
- **Exploration & Maps:** Procedural BSP-style rooms + corridors per depth (`src/game/exploration`). Renderer raycasts walls and tiles floor/ceiling textures from `public/assets/textures/**`.
- **Combat:** Turn-based encounters and bosses (`src/game/combat`), driven by `GameController.startCombat`.
- **Events & Narrative:** Data-driven events in `public/data/events.json` with mandatory/procedural hooks (`src/game/events/*`). Validate via `npm run validate:events`.
- **Party/Inventory/Economy:** Party stats/equipment in `src/game/state` and `src/game/characters`; items/inventory/money in `src/game/inventory` and `src/game/items.ts`.
- **Debug Panel:** In-game controls for combat tests, depth skip, one-hit kill, XP multiplier, and spawning showcase entities near the player (see `src/ui/app.ts`).

## 🛠️ Development

### Prerequisites

- Node.js 20 or higher
- npm

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Running Checks

```bash
# Run all CI checks locally
npm run ci

# Individual checks
npm run typecheck        # TypeScript type checking
npm run validate:events  # Validate event JSON
npm test                 # Run typecheck + event validation
```

## 🔄 CI/CD

The project uses GitHub Actions for automated testing and deployment:

- **CI Workflow**: Runs on all pull requests
  - TypeScript compilation check
  - Build verification
  - Event data validation
  - Security audit
  
- **Deploy Workflow**: Automatic deployment to GitHub Pages on merge to `main`

See [CI/CD Documentation](docs/ci-cd.md) for details on workflows and how to extend them for new features.

## 📦 Deployment

The game is automatically deployed to GitHub Pages when changes are pushed to the `main` branch. See [docs/deployment.md](docs/deployment.md) for detailed deployment information.

### Deployment Features

- ✅ Automatic deployment on push to `main`
- ✅ Manual deployment via GitHub Actions
- ✅ Production builds with optimized assets
- ✅ Proper base path configuration for GitHub Pages

## 📖 Documentation

- [Systems Overview](docs/SYSTEMS_OVERVIEW.md) - Cross-system map (exploration, combat, rendering, economy, debug tools)
- [Design Document](docs/design.md) - Comprehensive game design specification
- [Deployment Guide](docs/deployment.md) - GitHub Pages deployment documentation
- [CI/CD Guide](docs/ci-cd.md) - Continuous integration and deployment workflows
- [Event System](docs/event-system.md) - Complete event system documentation
- [Event System Quick Start](docs/event-system-quickstart.md) - Quick guide to the procedural event system

## 🎯 Game Features

- **Old-school dungeon crawling** with grid-based movement
- **Turn-based combat** with meaningful tactical decisions
- **Sanity mechanics** affecting perception and gameplay
- **Moral choice system** with lasting consequences
- **Procedural event system** with randomized story paths
- **Multiple endings** based on player decisions
- **Four unique characters** with personal stories and abilities
- **Data-driven content** using external JSON files

## 🎲 Event System

The game features a comprehensive procedural event system:

- **Mandatory Events**: Core story events that always appear (Pit Fall, Overflow Ward, etc.)
- **Optional Events**: Randomized side events for variety and replayability
- **Trigger Conditions**: Events appear based on depth, flags, party state, and moral alignment
- **Stateful Consequences**: Choices affect future events, party stats, and endings
- **Data-Driven Design**: All events defined in `public/data/events.json`

See the [Event System documentation](docs/event-system.md) for details on adding new events.

### Validate Events

```bash
# Validate event data JSON
npm run validate:events
```

## 🏗️ Tech Stack

- **TypeScript** - Type-safe game logic
- **Vite** - Fast build tool and dev server
- **HTML5 Canvas/DOM** - Rendering
- **LocalStorage** - Save game persistence

## 📄 License

See [LICENSE](LICENSE) file for details.

## 🤝 Contributing

This is a project under active development. Contributions, suggestions, and bug reports are welcome!
