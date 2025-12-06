# Procedural Event System - Quick Start

This guide helps you quickly get started with the procedural event system for "Depths of the Fractured Mind."

## What is the Procedural Event System?

The procedural event system provides:

- **Randomized story paths** - Events appear in different orders each playthrough
- **Mandatory events** - Core story events that always appear (Pit Fall, Overflow Ward, etc.)
- **Optional events** - Side events that add variety and replayability
- **Stateful consequences** - Player choices affect future events, party stats, and endings
- **Data-driven design** - All events defined in JSON files, easy to modify

## Quick Start

### 1. Events are automatically loaded

When the game starts, event data is automatically loaded from `/public/data/events.json`. No manual setup required!

### 2. Trigger events in your code

```typescript
import { GameController } from "./game";

const gameController = new GameController();

// Wait for events to load
setTimeout(() => {
  // Trigger a procedurally selected event
  gameController.triggerProceduralEvent();
}, 1000);
```

### 3. Events are selected based on game state

The system automatically:
- Prioritizes incomplete mandatory events
- Checks trigger conditions (depth, flags, party state)
- Uses weighted randomization for variety
- Ensures story progression is always achievable

## Key Features

### Mandatory Events (Always Appear)

1. **Pit Fall Event** - A floor collapses, forcing a rescue choice (Depth 2-3)
2. **Overflow Ward** - Comatose patients on failing life support (Depth 3)
3. **Riot Recording** - Elias confronts evidence of his past brutality (Depth 2)
4. **Confessional Chair** - Anya faces her betrayal of confidences (Depth 3-4)

### Optional Events (Randomized)

- Whispering Tunnel (Subject 13 specific)
- Medical Supply Cache
- Dying Patient Encounter
- Mirror Room Hallucination
- Former Colleague Encounter
- Subject 13 Origin Fragment
- Experimental Chamber (Miriam specific)
- Prayer Remnants (Anya specific)

### Event Pools

Events are organized into pools:
- `mandatory_events` - Must complete for story
- `optional_events` - General side events
- `depth_2_events` - Specific to Depth 2
- `depth_3_events` - Specific to Depth 3
- `depth_4_events` - Specific to Depth 4

## How Events Affect the Game

### Moral Flags

Every choice affects your moral alignment:
- **Mercy** vs **Cruelty**
- **Truth** vs **Denial**

These influence:
- Which events appear
- Character relationships
- Available endings

### Sanity

Tough choices reduce party sanity, which affects:
- Combat effectiveness
- Character behavior
- Event outcomes
- Ending variants

### Character Flags

Specific flags track character arcs:
- `eliasSeekingRedemption` - Elias acknowledges his crimes
- `miriamPreservedEvidence` - Miriam keeps her experiment records
- `anyaMaintainsFaith` - Anya holds onto her faith
- `subject13SeekingOrigin` - Subject 13 searches for their past

## Adding New Events

See `docs/event-system.md` for complete documentation on adding events.

Quick example:

```json
{
  "id": "my_event",
  "title": "My New Event",
  "description": "Something happens...",
  "choices": [
    {
      "id": "choice_1",
      "label": "Do something",
      "effects": {
        "sanityDelta": -1,
        "mercyDelta": 1
      }
    }
  ],
  "metadata": {
    "category": "optional",
    "triggerConditions": {
      "minDepth": 2
    },
    "priority": 5,
    "repeatable": false
  }
}
```

## Integration Examples

See `src/game/events/examples.ts` for detailed integration examples:

1. Triggering events on specific tiles
2. Random encounters during exploration
3. Depth-based events
4. Post-combat events
5. Story checkpoints
6. Event queues
7. Conditional events
8. Event cooldowns
9. Full exploration loop integration
10. Testing helpers

## Testing

To test the event system:

```typescript
import { testEventSystem } from "./game/events/examples";
import { GameController } from "./game";

const gameController = new GameController();
testEventSystem(gameController);
```

Check the browser console for test output.

## File Structure

```
src/game/events/
├── engine.ts         # Core event execution
├── loader.ts         # JSON loading and conversion
├── procedural.ts     # Event selection logic
├── types.ts          # TypeScript type definitions
├── resolvers.ts      # Effect application
├── mandatory.ts      # Legacy fallback events
└── examples.ts       # Integration examples

public/data/
└── events.json       # All event definitions

docs/
├── event-system.md   # Complete documentation
└── event-system-quickstart.md  # This file
```

## Troubleshooting

### Events not loading?

1. Check browser console for errors
2. Verify `/public/data/events.json` is accessible
3. Check JSON syntax is valid

### Event not appearing?

1. Check trigger conditions are met
2. Verify event is in appropriate pool
3. Ensure event hasn't already triggered (if not repeatable)

### Choice effects not working?

1. Verify flag names match `GameFlags` interface
2. Check effect deltas are numbers
3. Ensure `setFlags` uses correct types

## Next Steps

1. Read `docs/event-system.md` for complete documentation
2. Review `src/game/events/examples.ts` for integration patterns
3. Explore `public/data/events.json` to see all available events
4. Try modifying events to understand the system
5. Create your own events!

## Support

For issues or questions:
1. Check `docs/event-system.md` for detailed documentation
2. Review existing events in `public/data/events.json`
3. Look at integration examples in `examples.ts`
4. Check the game's design document: `docs/design.md`

## License

Part of "Depths of the Fractured Mind" - see project LICENSE file.
