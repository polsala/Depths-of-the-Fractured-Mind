# Event System Troubleshooting Guide

## Quick Diagnostics

Run these commands to check the event system health:

```bash
# Full test suite
npm test

# Just event validation
npm run validate:events

# TypeScript check
npm run typecheck

# Build check
npm run build
```

## Common Error Messages

### "Event not found: pit_fall_event"

**What it means**: The game tried to trigger an event that doesn't exist in the registry.

**Possible causes**:
1. Event data hasn't finished loading (race condition)
2. Event ID is misspelled in map or code
3. JSON file failed to load
4. Event was removed from JSON but is still referenced

**How to fix**:
1. Check browser console for "Event data loaded successfully" message
2. Verify event exists in `public/data/events.json`
3. Check spelling of event ID in all locations:
   - `public/data/events.json`
   - `src/game/exploration/map.ts`
   - `src/game/events/procedural.ts`
4. Clear browser cache and reload
5. Check network tab for failed requests to `/data/events.json`

**Debug commands**:
```javascript
// In browser console
import { listRegisteredEventIds } from './src/game/events/engine.ts';
console.log(listRegisteredEventIds());
```

### "Failed to load event data from /data/events.json"

**What it means**: The JSON file couldn't be loaded or parsed.

**Possible causes**:
1. JSON syntax error
2. File doesn't exist or moved
3. Network/server issue
4. Permissions issue

**How to fix**:
1. Run `npm run validate:events` to check JSON syntax
2. Verify file exists at `public/data/events.json`
3. Check browser console and network tab for details
4. Try accessing `/data/events.json` directly in browser
5. Restart dev server: `npm run dev`

### "Pool 'optional_events' not found"

**What it means**: Code references a pool that doesn't exist.

**Possible causes**:
1. Pool removed from JSON
2. Pool ID misspelled
3. JSON loading incomplete

**How to fix**:
1. Check pools section in `public/data/events.json`
2. Verify pool ID spelling
3. Ensure JSON loaded successfully

## Debugging Event Loading

### Check Loading Status

```javascript
// In browser console or game code
const controller = new GameController();

// Wait a moment for async loading
setTimeout(() => {
  console.log('Events loaded:', controller.isEventsLoaded());
  console.log('Has errors:', controller.hasEventLoadingError());
}, 1000);
```

### Monitor Loading Progress

Add temporary logging in `src/game/index.ts`:

```typescript
private async loadEvents(): Promise<void> {
  console.log('[EVENT LOADER] Starting event load...');
  try {
    console.log('[EVENT LOADER] Fetching /data/events.json...');
    await loadEventDataFile("/data/events.json");
    console.log('[EVENT LOADER] Events loaded successfully');
    this.eventsLoaded = true;
  } catch (error) {
    console.error('[EVENT LOADER] Failed:', error);
    this.eventLoadingError = error;
    this.eventsLoaded = true;
  }
}
```

## Debugging Event Triggering

### Check Event Registry

```javascript
import { getEventById, listRegisteredEventIds } from './src/game/events/engine.ts';

// List all events
console.log('Registered events:', listRegisteredEventIds());

// Check specific event
const event = getEventById('pit_fall_event');
console.log('Event details:', event);
```

### Verify Trigger Conditions

```javascript
import { checkTriggerConditions, getEventMetadata } from './src/game/events/procedural.ts';

const metadata = getEventMetadata('pit_fall_event');
const state = gameController.getState();

console.log('Metadata:', metadata);
console.log('Conditions met:', checkTriggerConditions(metadata?.triggerConditions, state));
```

### Track Movement Events

Add logging in `src/game/exploration/movement.ts`:

```typescript
if (tile?.eventId) {
  console.log('[MOVEMENT] Tile has eventId:', tile.eventId);
  const eventExists = getEventById(tile.eventId);
  console.log('[MOVEMENT] Event exists:', !!eventExists);
  
  if (eventExists) {
    console.log('[MOVEMENT] Triggering event:', tile.eventId);
    // ... rest of code
  }
}
```

## Debugging Procedural Selection

### Test Selection Logic

```javascript
import { selectEventForLocation } from './src/game/events/procedural.ts';

const state = gameController.getState();

// Test at different depths
for (let depth = 1; depth <= 4; depth++) {
  const testState = { ...state, location: { ...state.location, depth } };
  const selected = selectEventForLocation(testState);
  console.log(`Depth ${depth}:`, selected);
}
```

### Check Available Events

```javascript
import { getAvailableEvents, getIncompleteMandatoryEvents } from './src/game/events/procedural.ts';

const state = gameController.getState();

// Check mandatory events
const incomplete = getIncompleteMandatoryEvents(state);
console.log('Incomplete mandatory:', incomplete);

// Check what's available
const allEventIds = listRegisteredEventIds();
const available = getAvailableEvents(state, allEventIds);
console.log('Available events:', available);
```

## Performance Issues

### Too Many Events Loading Slowly

If you have hundreds of events:

1. Consider splitting into multiple JSON files
2. Implement lazy loading for non-critical events
3. Use event pools to limit active events
4. Check for large embedded data in events

### Memory Issues

If events consume too much memory:

1. Review event descriptions for unnecessary length
2. Check for circular references in event chains
3. Limit number of simultaneously active events
4. Clear completed events from memory if needed

## Validation Failures

### "Duplicate id 'event_name'"

Two events have the same ID. Each must be unique.

**Fix**: Rename one of the events to a unique ID.

### "Pool references unknown event 'X'"

A pool lists an event that doesn't exist.

**Fix**: Either add the event or remove it from the pool.

### "Invalid category 'X'"

Event metadata has invalid category.

**Fix**: Use one of: `mandatory`, `optional`, `character_specific`, `environmental`

### "Invalid characterFocus 'X'"

Event metadata has invalid character.

**Fix**: Use one of: `elias`, `miriam`, `subject13`, `anya`

## Network/Loading Issues

### Events Not Loading in Production

1. Check that `public/data/events.json` is included in build
2. Verify file path is correct (relative to build output)
3. Check server CORS settings
4. Ensure file is served with correct MIME type (`application/json`)

### Events Loading in Dev but Not Production

1. Compare file paths between dev and prod
2. Check Vite build configuration
3. Verify `public` directory is copied to dist
4. Test production build locally: `npm run build && npm run preview`

## State Issues

### Events Not Respecting Flags

Check flag setting in choice effects:

```json
{
  "effects": {
    "setFlags": {
      "eventCompleted": true  // ← Must match flag checks
    }
  }
}
```

And in trigger conditions:

```json
{
  "triggerConditions": {
    "requiredFlags": {
      "eventCompleted": false  // ← Must match flag name
    }
  }
}
```

### Events Triggering Multiple Times

If event shouldn't repeat:

```json
{
  "metadata": {
    "repeatable": false,  // ← Set to false
    "triggerConditions": {
      "requiredFlags": {
        "eventCompleted": false  // ← Check flag
      }
    }
  }
}
```

And set flag in choice:

```json
{
  "effects": {
    "setFlags": {
      "eventCompleted": true  // ← Set flag when completed
    }
  }
}
```

## Testing Checklist

When debugging event issues, verify:

- [ ] JSON syntax is valid (`npm run validate:events`)
- [ ] TypeScript compiles (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] Events load in console (check for success message)
- [ ] Event IDs are consistent across files
- [ ] Trigger conditions are appropriate
- [ ] Required flags exist in game state
- [ ] Pool references are valid
- [ ] Choice effects are valid
- [ ] No circular event dependencies

## Getting Help

If issues persist:

1. Check browser console for detailed error messages
2. Review recent changes to event files
3. Test with test-events.html page
4. Compare working events with broken ones
5. Temporarily add debug logging
6. Check git history for recent event changes
7. Create minimal reproduction case

## Useful Console Commands

```javascript
// Import necessary modules (in browser console with dev server)
import { GameController } from './src/game/index.ts';
import { listRegisteredEventIds, getEventById } from './src/game/events/engine.ts';
import { getAllPoolIds, getEventPool } from './src/game/events/loader.ts';

// Create controller
const gc = new GameController();

// Wait for events to load
setTimeout(() => {
  // List all events
  console.table(listRegisteredEventIds());
  
  // List all pools
  console.table(getAllPoolIds());
  
  // Check specific event
  console.log(getEventById('pit_fall_event'));
  
  // Check specific pool
  console.log(getEventPool('mandatory_events'));
}, 1500);
```
