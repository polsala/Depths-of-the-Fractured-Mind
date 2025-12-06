# Event System Documentation

## Overview

The event system in "Depths of the Fractured Mind" provides a flexible framework for creating narrative events that can be triggered during gameplay. Events are loaded from JSON files and can be selected procedurally based on game state.

## Architecture

### Core Components

1. **Event Engine** (`src/game/events/engine.ts`)
   - Manages event registration and retrieval
   - Handles event state transitions
   - Processes choice applications

2. **Event Loader** (`src/game/events/loader.ts`)
   - Loads event data from JSON files
   - Converts serializable events to runtime GameEvent objects
   - Manages event metadata and pools

3. **Procedural System** (`src/game/events/procedural.ts`)
   - Selects events based on trigger conditions
   - Handles event pools and selection strategies
   - Manages mandatory vs optional events

4. **Fallback Events** (`src/game/events/mandatory.ts`)
   - Provides hardcoded fallback events
   - Ensures critical events are always available
   - Registered before JSON data loads

## Event Lifecycle

```
1. Game Initialization
   └─> registerMandatoryEvents() - Register fallback events
   └─> loadEventDataFile() - Load events from JSON (async)

2. Player Movement
   └─> Check tile for eventId
   └─> Verify event exists in registry
   └─> If exists: Trigger event
   └─> If missing: Log warning, continue exploration

3. Event Processing
   └─> Display event to player
   └─> Player selects choice
   └─> Apply choice effects
   └─> Transition to next state (event/exploration)
```

## Critical Implementation Details

### Race Condition Prevention

Events are loaded asynchronously, which can cause race conditions if events are referenced before loading completes. The system handles this by:

1. **Fallback Events**: Critical events are registered synchronously at startup
2. **Existence Checks**: Movement system verifies events exist before triggering
3. **Loading State**: UI shows loading indicator until events are ready
4. **Graceful Degradation**: Missing events don't crash the game, just log warnings

### Event ID Consistency

Event IDs must be consistent across:
- JSON event definitions (`public/data/events.json`)
- Map tile references (`src/game/exploration/map.ts`)
- Procedural system references (`src/game/events/procedural.ts`)
- Fallback event definitions (`src/game/events/mandatory.ts`)

**Critical Event IDs** (validated by test suite):
- `pit_fall_event`
- `overflow_ward_event`
- `riot_recording_event`
- `confessional_chair_event`

## Adding New Events

### 1. Define Event in JSON

Add to `public/data/events.json`:

```json
{
  "id": "my_new_event",
  "title": "Event Title",
  "description": "Event description...",
  "choices": [
    {
      "id": "choice1",
      "label": "Choice Label",
      "description": "What happens if chosen",
      "effects": {
        "sanityDelta": -2,
        "mercyDelta": 1,
        "setFlags": {
          "myEventCompleted": true
        }
      }
    }
  ],
  "metadata": {
    "id": "my_new_event",
    "category": "optional",
    "triggerConditions": {
      "minDepth": 2
    },
    "priority": 5,
    "repeatable": false
  }
}
```

### 2. Add to Event Pool (Optional)

Include in appropriate pool:

```json
{
  "id": "depth_2_events",
  "events": [
    "existing_event",
    "my_new_event"
  ]
}
```

### 3. Reference in Map (Optional)

If event should trigger on specific tile:

```typescript
carveFloor(x, y, { eventId: "my_new_event" });
```

### 4. Validate

Run validation to ensure everything is correct:

```bash
npm run validate:events
```

## Trigger Conditions

Events can specify when they're available:

- `minDepth` / `maxDepth` / `specificDepth` - Depth requirements
- `requiredFlags` - Flag state requirements
- `minMercy` / `minCruelty` / `minTruth` / `minDenial` - Moral alignment
- `requireAllAlive` - All party members must be alive
- `specificCharacterAlive` - Specific character must be alive
- `customCondition` - Custom function (programmatic events only)

## Choice Effects

Choices can have various effects:

- `sanityDelta` - Change to sanity
- `hpDelta` - Change to HP
- `mercyDelta` / `crueltyDelta` / `truthDelta` / `denialDelta` - Moral alignment
- `setFlags` - Set flag values
- `removeItems` / `addItems` - Inventory changes (when implemented)
- `killCharacter` - Kill a party member
- `nextEventId` - Chain to another event

## Error Handling

### Missing Events

When an event is referenced but not found:

1. **Console Error**: Logs missing event ID and available events
2. **UI Feedback**: Shows helpful error message to player
3. **Graceful Recovery**: Allows return to exploration mode
4. **Fallback**: Uses hardcoded version if available

### Validation

The validator checks:
- JSON syntax
- Required fields
- Duplicate IDs
- Pool references
- Critical event presence

Run validation:
```bash
npm test
```

## Testing

### Automated Tests

```bash
npm test          # Run all tests
npm run typecheck # TypeScript validation
npm run validate:events # Event data validation
```

### Manual Testing

Open `test-events.html` in browser to:
- Test event loading
- Verify procedural selection
- Check trigger conditions
- Inspect event pools

### Console Testing

```javascript
// In browser console
const controller = new GameController();
await controller.isEventsLoaded(); // Wait for events

// Test specific event
controller.startEvent('pit_fall_event');

// List all events
import { listRegisteredEventIds } from './src/game/events/engine.ts';
listRegisteredEventIds();
```

## Common Issues

### "Event not found: X"

**Cause**: Event referenced before JSON loads or event doesn't exist

**Solution**:
1. Check event exists in `events.json`
2. Verify event ID spelling
3. Ensure JSON loaded successfully (check console)
4. Add fallback version if critical event

### Events Not Triggering

**Cause**: Trigger conditions not met or event already used

**Solution**:
1. Check trigger conditions match game state
2. Verify `repeatable` setting
3. Check required flags are set correctly
4. Use procedural system debugger

### Pool Selection Issues

**Cause**: No events available in pool or all filtered out

**Solution**:
1. Verify pool contains events
2. Check trigger conditions of pool events
3. Ensure at least one event matches current state

## Best Practices

1. **Always validate** after adding/modifying events
2. **Use meaningful IDs** that describe the event
3. **Set appropriate priorities** for procedural selection
4. **Test trigger conditions** across different game states
5. **Provide fallbacks** for critical events
6. **Document complex effects** in event descriptions
7. **Use pools** to organize related events
8. **Keep event IDs consistent** across all references

## Future Enhancements

Potential improvements to consider:

- [ ] Event history tracking
- [ ] Dynamic event generation
- [ ] Event requirement visualization
- [ ] Event editor tool
- [ ] More selection strategies
- [ ] Event dependencies/chains
- [ ] Save/load event state
- [ ] Event analytics
