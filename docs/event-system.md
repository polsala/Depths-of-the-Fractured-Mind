# Event System Documentation

## Overview

The event system in "Depths of the Fractured Mind" is a **procedural, data-driven** system that supports:

- Randomized event placement and sequencing
- Mandatory story events that always appear
- Optional side events for variety and replayability
- Stateful consequences affecting flags, party stats, and future events
- External JSON-based event definitions for easy content expansion

## Architecture

### Core Components

1. **Event Engine** (`src/game/events/engine.ts`)
   - Core event registration and execution
   - Manages event choices and state transitions

2. **Event Loader** (`src/game/events/loader.ts`)
   - Loads events from external JSON files
   - Converts serializable event data to runtime event objects
   - Manages event metadata and pools

3. **Procedural System** (`src/game/events/procedural.ts`)
   - Evaluates trigger conditions
   - Selects appropriate events based on game state
   - Manages event pools for randomization

4. **Event Data** (`public/data/events.json`)
   - External JSON file containing all event definitions
   - Includes mandatory and optional events
   - Defines event pools for procedural selection

## Event Structure

### Basic Event Definition

```json
{
  "id": "unique_event_id",
  "title": "Event Title",
  "description": "Narrative description of what happens",
  "choices": [
    {
      "id": "choice_id",
      "label": "Choice label shown to player",
      "description": "Description of what this choice means",
      "effects": {
        "sanityDelta": -2,
        "mercyDelta": 1,
        "setFlags": {
          "eventCompleted": true
        }
      }
    }
  ],
  "metadata": {
    "id": "unique_event_id",
    "category": "mandatory",
    "triggerConditions": {
      "specificDepth": 2
    },
    "priority": 10,
    "repeatable": false
  }
}
```

### Event Categories

- **mandatory**: Core story events that must occur (e.g., Pit Fall, Overflow Ward)
- **optional**: Side events that add variety to playthroughs
- **character_specific**: Events focused on a particular party member
- **environmental**: Events tied to locations rather than characters

### Trigger Conditions

Events can specify conditions that must be met before they can appear:

```json
"triggerConditions": {
  "minDepth": 2,              // Minimum depth level
  "maxDepth": 4,              // Maximum depth level
  "specificDepth": 3,         // Exact depth required
  "requiredFlags": {          // Flag requirements
    "eventCompleted": false
  },
  "minMercy": 5,              // Minimum mercy score
  "minCruelty": 5,            // Minimum cruelty score
  "minTruth": 3,              // Minimum truth score
  "minDenial": 3,             // Minimum denial score
  "requireAllAlive": true,    // All party members must be alive
  "specificCharacterAlive": "elias"  // Specific character must be alive
}
```

### Choice Effects

Each choice can have multiple effects:

```json
"effects": {
  "sanityDelta": -2,          // Change to party sanity
  "hpDelta": 5,               // Change to party HP
  "mercyDelta": 1,            // Change to mercy score
  "crueltyDelta": 2,          // Change to cruelty score
  "truthDelta": 1,            // Change to truth score
  "denialDelta": 1,           // Change to denial score
  "setFlags": {               // Set game flags
    "eventCompleted": true,
    "characterRedeemed": true
  },
  "killCharacter": "elias",   // Mark a character as dead
  "nextEventId": "follow_up"  // Chain to another event
}
```

## Event Pools

Event pools group related events for procedural selection:

```json
{
  "id": "depth_2_events",
  "name": "Depth 2 Events",
  "description": "Events that can occur in Depth 2",
  "events": [
    "riot_recording_event",
    "whispering_tunnel_event",
    "subject_13_origin_fragment"
  ],
  "selectionStrategy": "random"
}
```

### Selection Strategies

- **random**: Equal chance for each available event
- **weighted**: Events with higher priority are more likely
- **sequential**: Events trigger in order (first available)

## Adding New Events

### Step 1: Define the Event in JSON

Add your event to `public/data/events.json`:

```json
{
  "id": "my_new_event",
  "title": "A Strange Discovery",
  "description": "You find something unexpected...",
  "choices": [
    {
      "id": "investigate",
      "label": "Investigate closely",
      "description": "Take a closer look at what you found.",
      "effects": {
        "sanityDelta": -1,
        "truthDelta": 1,
        "setFlags": {
          "discoveredSecret": true
        }
      }
    },
    {
      "id": "ignore",
      "label": "Leave it alone",
      "description": "Some things are better left undisturbed.",
      "effects": {
        "denialDelta": 1
      }
    }
  ],
  "metadata": {
    "id": "my_new_event",
    "category": "optional",
    "triggerConditions": {
      "minDepth": 2,
      "maxDepth": 4
    },
    "priority": 5,
    "repeatable": false,
    "poolTags": ["optional_events", "depth_2_events"]
  }
}
```

### Step 2: Add to Event Pool (Optional)

Add the event ID to relevant pools:

```json
{
  "id": "optional_events",
  "events": [
    "existing_event_1",
    "existing_event_2",
    "my_new_event"
  ]
}
```

### Step 3: Add Required Flags (If Needed)

If your event uses new flags, add them to `src/game/state.ts`:

```typescript
export interface GameFlags {
  // ... existing flags ...
  discoveredSecret?: boolean;
}
```

## Procedural Event Selection

Events are selected procedurally based on the current game state:

1. **Mandatory Events First**: Incomplete mandatory events that meet trigger conditions are prioritized
2. **Depth-Specific Pools**: Events from depth-specific pools are considered next
3. **General Optional Pool**: Fallback to general optional events

### How Selection Works

```typescript
// Example: Triggering an event during exploration
gameController.triggerProceduralEvent();
```

The system:
1. Checks for incomplete mandatory events appropriate for current depth
2. Evaluates trigger conditions for all candidate events
3. Selects using weighted randomization based on priority
4. Returns `null` if no suitable event is available

## Integration with Game Loop

### During Exploration

Events can be triggered:
- When entering specific tiles (event tiles)
- Randomly during exploration
- After completing combat encounters
- At specific story checkpoints

### Example Integration

```typescript
// In exploration code
if (currentTile.type === 'event') {
  gameController.triggerProceduralEvent();
}

// Random encounter
if (Math.random() < 0.1) { // 10% chance per step
  gameController.triggerProceduralEvent();
}
```

## Best Practices

### Event Design

1. **Clear Choices**: Each choice should have distinct consequences
2. **Meaningful Impact**: Effects should matter to gameplay and narrative
3. **Balanced Costs**: Balance mechanical benefits with narrative weight
4. **Consistent Tone**: Match the game's psychological horror theme
5. **Replayability**: Optional events should vary outcomes significantly

### Trigger Conditions

1. **Not Too Restrictive**: Avoid conditions that make events too rare
2. **Logical Placement**: Match conditions to narrative context
3. **Test Coverage**: Ensure events can actually trigger in normal play
4. **Progressive Difficulty**: Harder choices in deeper levels

### Flags and Consequences

1. **Descriptive Names**: Use clear flag names (`eliasSeekingRedemption` not `flag1`)
2. **Boolean vs Numeric**: Use booleans for states, numbers for scores
3. **Document Usage**: Note where flags affect endings or future events
4. **Avoid Conflicts**: Don't set contradictory flags in same event

## Testing Events

### Manual Testing

1. Load the game
2. Check browser console for "Event data loaded successfully"
3. Trigger events during exploration
4. Verify choices appear and consequences apply

### Debugging

- Check browser console for event loading errors
- Verify JSON syntax is valid
- Ensure event IDs are unique
- Confirm trigger conditions are achievable

### Validation Checklist

- [ ] Event JSON is valid
- [ ] All event IDs are unique
- [ ] All referenced flags exist in GameFlags
- [ ] Trigger conditions are achievable
- [ ] Effects reference valid properties
- [ ] Choices have clear labels and descriptions
- [ ] Event is added to appropriate pools
- [ ] Priority is set appropriately

## Example: Complete Event Workflow

### 1. Design the Event

Story concept: "The player finds experimental notes about Subject 13"

### 2. Create JSON Definition

```json
{
  "id": "experimental_notes",
  "title": "Experimental Notes",
  "description": "Scattered papers detail procedures performed on Subject 13. The clinical language barely masks the horror.",
  "choices": [
    {
      "id": "read_all",
      "label": "Read everything carefully",
      "effects": {
        "truthDelta": 2,
        "sanityDelta": -2,
        "setFlags": { "knowsFullTruth": true }
      }
    },
    {
      "id": "skim",
      "label": "Skim and move on",
      "effects": {
        "truthDelta": 1,
        "sanityDelta": -1
      }
    }
  ],
  "metadata": {
    "category": "optional",
    "characterFocus": "subject13",
    "triggerConditions": {
      "minDepth": 2,
      "specificCharacterAlive": "subject13"
    },
    "priority": 4,
    "poolTags": ["optional_events"]
  }
}
```

### 3. Add Flag to State

```typescript
// In state.ts GameFlags
knowsFullTruth?: boolean;
```

### 4. Test in Game

- Start a new game
- Progress to Depth 2
- Trigger procedural events
- Verify event appears and effects work

## API Reference

### Key Functions

#### `loadEventDataFile(url: string): Promise<void>`
Load events from external JSON file.

#### `selectEventForLocation(state: GameState): string | null`
Select an appropriate event for current game state.

#### `checkTriggerConditions(conditions: EventTriggerConditions, state: GameState): boolean`
Check if event trigger conditions are met.

#### `getEventMetadata(eventId: string): EventMetadata | undefined`
Get metadata for a specific event.

#### `getEventPool(poolId: string): EventPool | undefined`
Get an event pool by ID.

## Future Enhancements

Potential additions to the event system:

1. **Dynamic Event Generation**: Generate events from templates
2. **Event Chains**: Multi-stage events with persistent state
3. **Conditional Text**: Vary descriptions based on flags
4. **Timed Events**: Events that appear after X turns or time
5. **Character-Specific Pools**: Separate pools per party member
6. **Location Tags**: Assign events to specific room types
7. **Event History**: Track which events have been seen
8. **Weighted Pools**: Different weights per depth/state

## Troubleshooting

### Events Not Loading

- Check browser console for errors
- Verify `public/data/events.json` is accessible
- Confirm JSON syntax is valid
- Check network tab in dev tools

### Event Not Appearing

- Verify trigger conditions are met
- Check if event is in appropriate pool
- Ensure event hasn't already triggered (if not repeatable)
- Confirm required flags are set correctly

### Choice Effects Not Working

- Verify flag names match GameFlags interface
- Check effect deltas are numbers
- Ensure setFlags uses correct types
- Look for TypeScript compilation errors

## Conclusion

This event system provides a flexible, data-driven foundation for creating rich, varied narrative experiences. By separating event content from code, it enables easy expansion and modification without rebuilding the game.

For more information, see:
- `src/game/events/types.ts` - Type definitions
- `src/game/events/loader.ts` - Loading implementation
- `src/game/events/procedural.ts` - Selection logic
- `public/data/events.json` - Event data
