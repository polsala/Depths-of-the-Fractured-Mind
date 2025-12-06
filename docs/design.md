# Depths of the Fractured Mind  
**Game Design Document – `design.md`**

> This document is meant to be self-contained and can be used as a high-level prompt/specification for an implementation agent (e.g. Codex, Copilot-assisted dev, etc.).  
> It describes the game’s fiction, systems, user experience, and technical constraints in enough detail to build a complete MVP and extend it later.

---

## 0. Metadata

- **Working Title:** Depths of the Fractured Mind  
- **Genre:** Old-school dungeon crawler, turn-based, psychological horror  
- **Target Platform:** Web (desktop browser)  
- **Hosting:** Static (e.g. GitHub Pages)  
- **Tech Stack (recommended):** HTML + CSS + TypeScript/JavaScript + Canvas/DOM  
- **Gameplay Scope (MVP):**
  - Party of 4 fixed canonical characters
  - 4–5 dungeon floors (“Depths”)
  - Turn-based combat
  - Sanity & morality systems
  - 4 main endings + 1 secret ending
  - Persistent saves in browser

---

## 1. Vision & Core Pillars

### 1.1 One-sentence Pitch

A dark, psychological old-school dungeon crawler where a party of four descends into a twisted underground facility, confronting both physical horrors and their own guilt through morally ambiguous choices that shape sanity, relationships, and multiple endings.

### 1.2 Core Pillars

1. **Old-school dungeon crawling**
   - Grid/tile-based movement.
   - Turn-based combat with simple but meaningful decisions.
   - Low-res, pixel-art inspired visual style.

2. **Psychological and moral tension**
   - Sanity mechanics that affect perception, combat, and narrative.
   - Tough decisions: mercy vs survival, truth vs denial.
   - Events with consequences that echo later (NPCs, endings, character arcs).

3. **Narrative & characters**
   - 4 deeply flawed party members, all complicit in the Facility’s horrors.
   - Interactions and personal events that reveal their pasts.
   - Multiple endings influenced by moral choices and who survives.

4. **Lightweight, web-friendly implementation**
   - No backend; static hosting compatible.
   - All state stored client-side (localStorage, IndexedDB, optional JSON export).
   - Clean separation between engine code and content (data-driven).

---

## 2. High-Level Requirements

### 2.1 Game Requirements

- Playable end-to-end from Depth 1 to Depth 5.
- Player can:
  - Move the party through maps.
  - Engage enemies in turn-based combat.
  - Trigger and resolve events with branching choices.
  - Track party HP/sanity and a small set of resources.
  - Reach a final Depth and see one of multiple endings.

### 2.2 Design Constraints

- **Style:**
  - Low resolution (e.g. 320×200 internal, scaled).
  - Minimal animations; focus on atmosphere via color and UI.
  - “Old-school” look (pixel-artish, simple shapes).

- **Tone:**
  - Psychological horror: guilt, complicity, moral ambiguity.
  - Focus on emotional impact rather than explicit gore.
  - No “good vs evil” binary; mostly grey choices.

- **User Experience:**
  - Keyboard + mouse friendly.
  - Short readable text, but rich enough to convey mood.
  - Simple menus and short loops suitable for web sessions.

---

## 3. Fiction: Setting, Backstory & Themes

### 3.1 Setting

- **Location:**  
  A large underground **Facility** beneath an unnamed city.  
  Mix of:
  - Psychiatric ward
  - Experimental research lab
  - Detention/prison complex

- **Technology level:**  
  Vaguely late-20th-century:
  - Old monitors, tape recorders
  - Mechanical locks, analog consoles
  - Surgical tools, wired apparatus

- **Layout:**
  - Organized into **Depths**, each with its own mood and specialty.
  - Depths are linear in progression but maps can have optional branches.

### 3.2 The Engine & The Catastrophe

The Facility developed a central device called **“The Engine”**:

- Purpose (official):  
  To **externalize, cleanse, and share collective guilt and trauma**, “healing” patients and staff via synchronized neural stimulation and quasi-ritual protocols.

- Reality:
  - It amplifies and manifests guilt, fear, and trauma into **physical/mental horrors**.
  - It connects minds; boundaries between real and hallucinated become thin.

**Catastrophe:**

- A major experiment using Subject 13 as a focal point goes wrong:
  - Power surges, lockdowns malfunction.
  - Patients and staff are killed, mutated, or mentally shattered.
  - The Facility becomes a hybrid of physical ruin and psychic distortion.

The game begins shortly after this event, with the four central characters converging and deciding to descend towards the Engine.

### 3.3 Themes

- **Guilt and complicity:**  
  All four protagonists are in some way responsible for what happened.
- **Denial vs truth:**  
  They can downplay their role or confront it.
- **Mercy vs survival:**  
  Cruel decisions may yield tactical advantages, but at a cost.
- **Identity and perception:**  
  Subject 13 and the Engine blur past/future and reality/illusion.

---

## 4. Core Characters (Canonical Party)

The “default” party consists of the four canonical characters below.  
The MVP can lock the party to these four (no character creation), but systems should be generic enough to support future archetypes.

Each character has:

- **Mechanical role**
- **Personality traits**
- **Backstory & guilt**
- **Sanity behavior**
- **Personal events**

### 4.1 Shared Character Mechanics

Baseline stat suggestions (feel free to tweak numbers, but keep relative tendencies):

- **Stats:**
  - `HP` – Health.
  - `SAN` – Sanity.
  - `ATK` – Physical attack power.
  - `DEF` – Physical defense.
  - `WILL` – Mental defense (resist fear/insanity).
  - `FOCUS` – Chance to hit / crit / succeed in skill checks.

- **Progression:**
  - Each character levels up with EXP.
  - Level-ups increase stats and unlock abilities.

- **Abilities:**
  - Each character has 6–10 abilities, unlocked by level or events.
  - Abilities consume resources (e.g. stamina, focus, or SAN).

- **Traits (optional):**
  - Permanent modifiers gained from key decisions (e.g. “Remorseless”, “Repentant”).

---

### 4.2 Elias Ward – The Warden

**Role:** Front-line tank / crowd control  
**Age:** Late 40s

#### Public Role vs Truth

- **Public:** Head of security; “kept order” in a dangerous facility.
- **Truth:** Systematically brutalized patients and staff, using excessive force, solitary confinement, and psychological intimidation.

#### Background

- Military/security background, raised on discipline and chain of command.
- Brought in to “stabilize” the Facility after previous unrest.
- Introduced harsher protocols:
  - Extra restraints, extended solitary confinement.
  - “Preventive” beatings, sleep deprivation.
- Orchestrated a riot suppression in which many patients were killed unnecessarily; official reports portray it as a heroic act.

#### Personality

- Curt, pragmatic, controlled emotions.
- Hates displays of weakness (in himself and others).
- Rationalizes his methods as the only way to preserve order.

#### Sanity & Behavior

- High SAN: Focused, efficient; justifies actions calmly.
- Mid SAN: Increasingly rigid, issues commands, less empathetic.
- Low SAN:
  - May lash out at allies in combat (verbal or physical).
  - Might impose “discipline” on party members (self-damage vs buff events).

#### Example Ability Concepts

*(Implementation agent should design actual numbers and effects.)*

- **Stand Firm** – Increase DEF/guard party, draws attacks.
- **Crackdown** – Attack an enemy with chance to stun; slight SAN loss if used on already weakened enemy.
- **Commanding Presence** – Boost party accuracy/DEF, minor SAN recovery if party obeyed earlier.

#### Personal Events

- **Riot Recording:**  
  In Depth 2 (Archive), party finds audio logs of the riot. Player can:
  - Deny it’s real → Denial flag, Sanity preserved short-term.
  - Admit fault → unlocks possible redemption arc, SAN penalty.
  - Justify → Cruelty/Order flag increase.

- **Prisoner’s Memory:**  
  Later, an apparition or hallucination of a former prisoner confronts him about specific abuse. How he reacts influences his ending variants.

---

### 4.3 Dr. Miriam Kessler – The Surgeon

**Role:** Healer / debuffer / dark support  
**Age:** Late 30s

#### Public Role vs Truth

- **Public:** Brilliant experimental neuropsychiatrist, pushing boundaries of treatment.
- **Truth:** Routinely sacrificed ethics; saw patients as data, not people.

#### Background

- From a prestigious academic/research lineage.
- Joined the Facility specifically to conduct radical studies:
  - Lobotomies, invasive surgeries.
  - Chemical treatments and brainwave synchronizations.
- Ran a “group therapy” experiment that left patients in catatonic or worse states. She sanitized the results to preserve her career.

#### Personality

- Calm, clinical, often cold.
- Speaks in medical jargon and procedure codes.
- Genuinely believes progress requires sacrifice, but repressed guilt leaks through.

#### Sanity & Behavior

- High SAN: Precise, careful; clinically rational.
- Mid SAN: Disassociates; describes suffering in increasingly detached terms.
- Low SAN:
  - May propose or enact extreme “treatments”.
  - Might turn allies into “patients” in events (buffs with heavy cost).

#### Example Ability Concepts

- **Field Surgery** – Restore HP; small SAN cost to Miriam.
- **Experimental Serum** – Buff target (ATK/DEF/WILL) with chance of side effect (e.g. poison, SAN loss).
- **Sedative Injection** – Debuff enemy (lower ATK/WILL), small chance to fail horribly.

#### Personal Events

- **Overflow Ward:**  
  Room of comatose patients on failing machines (Depth 3).
  - Shut down life support → salvage parts (resources), Mercy/Cruelty ambiguity.
  - Try to stabilize → costs resources, may save one who later helps.
  - Walk away → they die slowly, characters react.

- **Case Notes:**  
  Notes reveal her sanitized versions vs reality. Player chooses whether she acknowledges the truth.

---

### 4.4 Subject 13 – The Subject

**Role:** Wildcard caster / hybrid  
**Age:** Appears mid-20s

#### Identity & Records

- Records contradict: sometimes 13 is listed as criminal, political dissident, or voluntary experimental patient.
- Their identity is fragmented; 13 is not entirely sure who they were before.

#### Background

- Core testbed for the Engine.
- Repeatedly exposed to neural conditioning, sensory manipulation, and shared-consciousness experiments.
- Developed unstable perception: sees glimpses of other times/realities.
- May have betrayed another patient in exchange for less pain or special treatment.

#### Personality

- Oscillates between:
  - Lucid clarity, almost prophetic.
  - Cryptic, metaphorical speech.
- Sometimes addresses the *player* as if aware of the game/meta context (especially at low SAN).

#### Sanity & Behavior

- High SAN: Strange but coherent; predictive insights.
- Mid SAN: Intermittent visions, sometimes helpful, sometimes distracting.
- Low SAN:
  - Abilities become more powerful but unpredictable.
  - Might misfire spells in combat with both beneficial and harmful side effects.

#### Example Ability Concepts

- **Fractured Sight** – Reveal parts of the map or enemy stats; small SAN shift.
- **Echo Bolt** – Magical attack with chance to bounce to random target (friend or foe).
- **Future Scream** – Debuffs all enemies (Fear/Panic), SAN cost to 13 and minor SAN damage to allies.

#### Personal Events

- **Whispering Tunnel:**  
  13 hears voices or “future echoes” leading to a side room.
  - Follow the voice → loot + ambush; SAN change, new spell.
  - Ignore → safe path; relationship with 13 worsens.

- **Origin Fragments:**  
  Scattered logs with conflicting info about 13’s “crime” or role, influencing the secret ending.

---

### 4.5 Sister Anya Velasquez – The Confessor

**Role:** Sanity support / minor healer / buffer  
**Age:** Early 40s

#### Public Role vs Truth

- **Public:** Chaplain, counselor, spiritual caretaker.
- **Truth:** Provided “confidential” reports that were weaponized against patients.

#### Background

- Former street preacher; transitioned into institutional chaplaincy.
- Hoped to bring compassion and faith into the Facility.
- Required to document all patient confessions and observations.
- Those reports were used to restrict, punish, or experiment on patients.
- At least one patient disappeared after she broke their trust.

#### Personality

- Gentle, warm tone; carefully chosen words.
- Loss of faith is noticeable under the surface.
- Under stress, can become surprisingly cold and pragmatic.

#### Sanity & Behavior

- High SAN: Offers comfort, tries to mediate conflicts.
- Mid SAN: Doubts faith, questions whether any of this can be redeemed.
- Low SAN:
  - Might become zealously judgmental or nihilistic.
  - Abilities may shift from soothing to punishing.

#### Example Ability Concepts

- **Prayer of Calm** – Restore SAN to party, minor HP or buff.
- **Word of Guilt** – Debuff enemy WILL (confronts them with guilt).
- **Shared Burden** – Redistribute SAN or HP between characters.

#### Personal Events

- **Confessional Chair:**  
  A special room where sessions were recorded.
  - She can listen to tapes of herself betraying confidences.
  - Confess honestly → SAN damage, but unlocks redeeming path/ability.
  - Minimize responsibility → maintain SAN, deepen Denial flag.
  - Refuse to engage → blocks some redemption outcomes.

- **NPC Confession Event:**  
  NPC confesses past crimes and begs her not to tell; she can:
  - Keep the secret → NPC may aid later, but blame might fall on party.
  - Report them → gain systemic help/resources, but Anya’s faith & SAN suffer.

---

## 5. Gameplay Overview

### 5.1 Core Loop

1. **Explore** the current Depth:
   - Move tile-by-tile.
   - Reveal map and discover rooms, enemies, and events.
2. **Encounter threats/events**:
   - Combat, traps, narrative vignettes.
3. **Make decisions**:
   - Choose event options (moral choices).
   - Manage resources (HP, SAN, items).
4. **Advance deeper**:
   - Find key(s) or complete conditions to unlock stairways/elevators.
5. **Interlude**:
   - Between Depths, short scenes and dialogue, party reflection, potential SAN/HP adjustments.
6. **Final approach**:
   - Reach the Engine and trigger final sequence, culminating in one of several endings.

### 5.2 Combat

- Turn-based, side-view or abstract:
  - Player selects actions for each character.
  - Enemies act in between or after.
- Actions:
  - Basic attack.
  - Use ability.
  - Use item.
  - Defend.
  - Attempt to flee.
- Manage:
  - HP (do not die).
  - SAN (avoid breakdowns).
  - Status effects.

### 5.3 Exploration

- Movement on a grid of tiles.
- Each tile:
  - Wall, corridor, room, special tile (trap, puzzle, event).
- Unknown tiles hidden until visited; optional fog-of-war/minimap.

---

## 6. Systems in Detail

### 6.1 Stats & Conditions

**Base Stats (per character & per enemy):**

- HP (current/max)
- SAN (current/max)
- ATK
- DEF
- WILL
- FOCUS

**Derived Systems:**

- Hit chance based on ATK vs enemy DEF + FOCUS.
- Resistances/susceptibility to SAN damage based on WILL.

**Status Effects (examples):**

- Bleeding – Lose HP each turn.
- Poisoned – Lose HP each turn, reduced ATK.
- Stunned – Lose next action.
- Feared/Panicked – Chance to skip action or misbehave.
- Paranoid – May target allies accidentally.

### 6.2 Sanity System

**SAN** is a per-character resource:

- Decreases from:
  - Horrific events.
  - Seeing allies die.
  - Using dark abilities.
  - Certain enemies and locations.
- Increases from:
  - Rest.
  - Comforting events (Anya’s abilities).
  - Facing and accepting truth (with short-term SAN losses but long-term benefits in relationships/endings).

**Sanity thresholds**:

- High SAN:
  - Minimal negative effects.
  - Access to more controlled abilities.
- Mid SAN:
  - Occasional minor hallucinations (visual/audio/UI effects).
  - Some checks may fail (dialogue, event outcomes).
- Low SAN:
  - Increased chance of negative combat behaviors.
  - Unlocks powerful but risky abilities or event options.
  - Strong influence on darker endings.

### 6.3 Moral / Narrative Flags

Track global and per-character metrics:

- **Mercy/Cruelty score**
  - +Mercy: Sparing enemies, saving NPCs, choosing hard but compassionate options.
  - +Cruelty: Executions, abandonment, unethical experiments.

- **Truth/Denial score**
  - +Truth: Confronting evidence, admitting guilt, reading painful logs.
  - +Denial: Destroying/ignoring evidence, justifying actions, lying.

- **Trust/Relationship indicators**
  - High-level metrics reflecting how much the party believes in or resents each other.

These influence:

- Which events appear or how they branch.
- Final boss form/behavior in the Core.
- Ending selection and variations.

### 6.4 Events & Decisions

**Event types:**

- Environmental (e.g. falling floor).
- NPC encounters.
- Log/diary discovery.
- Personal (character-specific triggers).

**Event structure (conceptual):**

- `id`
- `triggerConditions` (Depth, flags, party composition, etc.)
- `descriptionText`
- `choices[]`:
  - `label`
  - `requirements` (items, stats, flags)
  - `effects` (HP/SAN changes, flags, inventory, branching)
  - Optional `followupEvent` or `nextEventId`

Implementation agent should make a simple event system that displays text and choices, applies consequences, and updates state cleanly.

---

## 7. Key Designed Events (Must Implement)

These are **mandatory** scenarios to include in the MVP.

### 7.1 The Broken Floor & The Pit (Party Split / Moral Choice)

**Trigger:**  
Random or scripted tile in a crumbling corridor (recommended first half of game, maybe Depth 2–3).

**Setup:**

- A random or pre-designated character steps onto a weak floor tile.
- Floor collapses; they fall, breaking a leg.

**Text Example (flavor):**

> The stone groans beneath [CHAR_NAME]’s boots.  
> A jagged crack races across the tiles before anyone can react.  
> The floor gives way.  
> Their scream echoes from the dark below, followed by a sickening thud.

**Game state:**

- The fallen character is in a lower shaft, HP reduced, leg injury status.

**Choices (minimum 4):**

1. **Risky Rope Descent**
   - Tie rope to a nearby anchor, send a rescuer down.
   - The rope or anchor partially fails → both end up in the lower area.
   - Party is temporarily split:
     - Group A (top) with 2 characters.
     - Group B (bottom) with 2 characters.
   - Each group explores short segments:
     - Different encounters, events.
     - Eventually find paths to reunite.
   - Consequences:
     - Mercy/Trust +.
     - SAN adjustments (fear, pain, but solidarity).
     - If Elias is the rescuer, possible shift toward responsibility.

2. **Abandon Them**
   - “We can’t risk more lives for one person.”
   - Fallen character is left behind, effectively dead (or “lost”).
   - Abandonment flag +, Cruelty +.
   - Other characters react (dialogue & SAN changes).
   - Later:
     - Find corpse or twisted version of that character.
     - Influences darker endings.

3. **Careful, Resource-Heavy Rescue**
   - Requires items (rope + metal/wood) or skill check.
   - Build a safer harness/pulley.
   - Successful rescue without second fall.
   - Leg injury persists as a debuff until treated in a later event.
   - Costs resources/time.
   - Strong Trust/Mercy increase.

4. **“Mercy” Kill**
   - Available if rescue is impossible or strongly framed as such.
   - A chosen party member delivers killing blow from above (shot, thrown object, etc.).
   - Large SAN damage on executor, moderate SAN loss for others.
   - Ambiguous Mercy/Cruelty impact (mercy killing vs murder).
   - Event referenced later in visions/dreams and potentially in endings.

### 7.2 Overflow Ward (Miriam-focused)

**Location:** Depth 3 – The Ward.

**Scenario:**

- A row of comatose patients on failing life support machines.
- Machinery sparking, alarms weakly beeping.

**Choices:**

1. **Shut Down Life Support**
   - Patients die quickly and quietly.
   - Gain salvageable parts (resources, maybe unique item).
   - Cruelty/Mercy ambiguous, but generally counts toward “hard pragmatism”.
   - Miriam’s reaction depends on earlier choices.

2. **Try to Stabilize**
   - Spend resources (medical supplies, time).
   - Skill check (e.g. based on Miriam’s level or WILL/FOCUS).
   - Success: one patient later appears as helper NPC or event.
   - Failure: patients die anyway; resources wasted; SAN impact.

3. **Leave Them**
   - Do nothing.
   - Characters react; heavy mood text.
   - They die slowly, but no immediate benefit or cost (except sanity/flags).

### 7.3 Riot Recording (Elias-focused)

**Location:** Depth 2 – The Archive.

**Scenario:**

- In a file room, the party finds an old tape or log.
- Playback reveals the riot: Elias ordering beatings and lethal force.

**Choices:**

1. **Deny Authenticity**
   - Elias claims the recording is altered or incomplete.
   - Truth/Denial: +Denial.
   - Short-term SAN preservation for Elias.

2. **Admit Responsibility**
   - He acknowledges wrongdoing.
   - SAN loss (guilt spike), but unlocks certain redemption interactions later.
   - Truth/Denial: +Truth.

3. **Justify Actions**
   - “I did what was necessary to prevent worse chaos.”
   - Cruelty/Order flag +.
   - Some characters will react negatively (Anya, 13).

### 7.4 Confessional Chair (Anya-focused)

**Location:** Later Depth (3 or 4), therapy wing.

**Scenario:**

- A special chair with recording devices.
- Archives of Anya’s sessions where she broke confidentiality.

**Choices:**

1. **Listen & Confess**
   - She fully confronts what she did.
   - SAN hit now; unlock higher redemption potential or new ability focused on genuine comfort.
   - Truth/Denial: +Truth.

2. **Minimize/Justify**
   - “I had no choice. It was procedure.”
   - Smaller immediate SAN impact.
   - Blocks some positive ending paths.
   - Truth/Denial: +Denial.

3. **Refuse to Engage**
   - She won’t listen.
   - Avoids immediate pain but leaves guilt unaddressed.
   - Relationship with other characters may shift subtly (they know she’s avoiding it).

---

## 8. World & Level Design

### 8.1 Depth Overview

Minimum 4 full Depths + final Core:

1. **Depth 1 – The Threshold**
   - Tutorial-ish.
   - Basic enemies (rats, deranged guards).
   - Introduce simple events.

2. **Depth 2 – The Archive**
   - Records, logs, administrative offices.
   - Information-focused events (Riot Recording, 13’s files).
   - Some puzzles (code locks, file sorting).

3. **Depth 3 – The Ward**
   - Rows of beds, isolation rooms, medical equipment.
   - Overflow Ward event.
   - Enemies embody patient suffering.

4. **Depth 4 – Labyrinth of Mirrors**
   - Confusing layout, repeated corridors, illusions.
   - Some map tiles “lie”.
   - Events where SAN changes map perception.

5. **Depth 5 – The Core (Engine)**
   - Bio-mechanical architecture.
   - Strongest enemies and final boss.
   - Final decisions and endings.

### 8.2 Map Structure

- Each Depth is a 2D grid (e.g. 20×20 tiles).
- Tile types:
  - Wall
  - Floor
  - Door (locked/unlocked)
  - Trap
  - Event tile
  - Stairs/elevator

Data should be external (e.g. JSON per Depth) describing:

- Tile layout.
- Starting position.
- Event triggers.
- Enemy encounter zones.

---

## 9. UI, Controls & Audio

### 9.1 UI Layout

Recommended structure:

- **Top/Center:** Main viewport (dungeon/corridor or combat view).
- **Bottom:** Party bar:
  - Portraits (Elias, Miriam, 13, Anya).
  - HP/SAN bars or numeric.
  - Small icons for status effects.
- **Right side / Panel:**  
  - Text log (events, combat messages).
  - Dialogue and choices.

### 9.2 Controls

- **Keyboard:**
  - Arrow keys or WASD: movement (in exploration).
  - Enter/Space: confirm/interaction.
  - Number keys: select abilities/choices.
  - ESC: menu/pause.

- **Mouse:**
  - Click buttons/choices.
  - Possible click-to-move on minimap (optional).

### 9.3 Audio

- **Music:**
  - Low-bit/chiptune or ambient loops.
  - Each Depth can have its own track.

- **SFX:**
  - Attacks, hits, UI clicks, footsteps, ambient hums.

Volume should be adjustable or at least have a mute/toggle.

---

## 10. Technical & Implementation Notes

### 10.1 Architecture (Suggested)

- `/index.html`
- `/src/`
  - `main.ts` – entry point.
  - `game/`
    - `state.ts` – GameState, structures.
    - `characters.ts` – character definitions.
    - `combat.ts` – combat system.
    - `exploration.ts` – movement, map transitions.
    - `events.ts` – event system and event registry.
    - `sanity.ts` – sanity and morality logic.
    - `endings.ts` – ending resolution logic.
  - `ui/`
    - `render.ts` – drawing views (exploration/combat).
    - `input.ts` – keyboard/mouse input.

- `/assets/`
  - `img/` – sprites, backgrounds.
  - `audio/` – music, SFX.
  - `data/`
    - `depth1.json`, `depth2.json`, etc.
    - `events.json`, `enemies.json`, `items.json`.

### 10.2 Saving & Loading

- Use `localStorage` or IndexedDB to store:
  - Party state.
  - Depth & map position.
  - Flags (Mercy/Cruelty, Truth/Denial, personal flags).
- Optionally:
  - Export/import save as JSON string via simple text area.

---

## 11. Content Scope & Milestones

### 11.1 MVP Content Targets

- 4–5 Depths with unique tileset themes.
- 15–20 enemy types.
- 4–6 bosses/minibosses.
- 40–60 items.
- 6–10 abilities per core character.
- 30+ generic events.
- 10–15 character-specific events (including all mandatory ones).

### 11.2 Suggested Implementation Order

1. **Core Engine:**
   - GameState, characters, combat basics, exploration without events.

2. **UI & Input:**
   - Basic layout, movement, simple combat view.

3. **Sanity & Flags:**
   - Implement SAN and moral flag modifications.

4. **Event System:**
   - Simple text-and-choices framework.
   - Implement mandatory events.

5. **Depths & Content:**
   - Build Depth 1 fully, then Depth 2, etc.
   - Add enemies, items, and more events.

6. **Endings:**
   - Implement logic mapping flags & character fates to 4+1 endings.

7. **Polish:**
   - Audio, minor visual improvements, balancing.

---

## 12. Implementation Agent Instructions (Summary)

If you are an implementation agent (e.g. Codex):

- **Do not change the tone or core structure.**
- **Implement in a way that runs in a static web environment** (compatible with GitHub Pages).
- Focus first on:
  1. Game state types and systems (combat + exploration + sanity).
  2. UI scaffolding.
  3. Mandatory story events (pit, overflow ward, riot recording, confessional).
- Make data (maps, events, enemies) external and easy to expand.
- Once the MVP is playable end-to-end with a rudimentary ending, iterate on:
  - More events and choices.
  - Visual/audio polish.
  - Balancing and bug fixes.

> This `design.md` is the primary reference.  
> Additional smaller docs can refine specific systems, but this should remain the “source of truth” for narrative tone, core mechanics, and structure.

