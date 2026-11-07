# Save and Continue

The title screen offers **Continue**, **Import Save**, **Export Save** and **Delete Save** when appropriate. Starting a new run or importing over an existing run asks for confirmation. Exploration also offers **Save Now**, **Export Save** and **Save & Return to Title**. The game auto-saves after gameplay updates and on page exit.

Saves are kept in this browser's local storage under `depths-of-the-fractured-mind.run.v1`. They are not synchronized between devices. Export a JSON backup before clearing browser data or moving devices. Storage may be unavailable in private browsing or when quota is exhausted; the UI reports failure instead of claiming success.

Version 1 snapshots contain the complete party, inventory and equipment, current mode/location, all generated depth maps and mutable tiles, fog/visited tiles, moral/event/boss flags, active event or combat, procedural event cooldown and the current deterministic RNG state. Combat snapshots resume at a completed action boundary; the combat party is re-linked to the main party during loading. Audio playback and rendering caches are recreated by the UI, not serialized.

The loader validates the schema before replacing an existing run. Unsupported newer versions and malformed saves stay available for export or deletion; they are never silently overwritten. The pre-release version 0 format is migrated to version 1 with empty completed-event tracking and a deterministic fallback RNG state. No version 0 public release existed.

Known limitations: browser storage is local to one origin; cross-device progress requires manual export/import. The campaign ending is not implemented yet (tracked in #41), so persistence does not imply that the game is complete.
