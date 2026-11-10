# Phase 01B — cast and physical presence

Implementation milestone between 01A and 02. Candidate art and acting require human review; passing automation does not constitute artistic acceptance. Canonical identities and backstories remain in `docs/design.md`. Historical Phase 01A evidence is retained.

## Authority and viewpoint

The existing grid, controller, event, combat and save systems own every action and result. `PresenceDirector` copies only identity, alive, wounded and distressed scalars into a transient timeline. It has no controller, RNG, inventory, collision, reward or save callback. No save schema change is needed. The exploration party portrait buttons choose a living protagonist for presentation; combat shows the resolving actor for the complete existing 650 ms cue, then the current actor. The viewpoint is session-only. A fallen selected protagonist falls back to a living party member.

`PresenceView` is a transparent, input-pass-through layer clipped to the world viewport. The primary world remains Three.js WebGL2; the labeled Canvas fallback receives the same body presentation. The layer owns one cancellable RAF and no WebGL context. Replacing a mode/depth/quality shell disposes it. It never affects CameraRig's position, FOV, horizon or movement duration.

## Visibility and composition

Hands enter the lower frame, leaving the navigation center and upper scene open. Idle presence is quiet; context changes the pose rather than putting a large permanent weapon in front of the world. Hands hide during loading, dialogs, settings, events, conversations, endings and game over. Combat reserves a 72-source-pixel band between enemy targets and party vitals; its clipped foreground cannot cover either information region. Targets, intents and DOM action controls remain available. Exploration hurt poses use a smaller 38% desktop / 46% mobile cell width so the supported wrist stays below the counter read. The hand layer cannot intercept pointer, touch or keyboard input.

Elias uses slate security cuffs and guarded palms, Miriam bone/burgundy cuffs and precise fingers, Subject 13 pale bandaged hands and olive sleeves, and Anya deep teal sleeves and measured open gestures. These are the same identity cues as their body art and portraits. No new equipment or fictional weapon is inferred from a pose.

## Action language

| Context | Presentation | Rule boundary |
| --- | --- | --- |
| Idle | Lower-frame rest with at most subpixel-to-one-pixel breathing | No repeated action or RNG |
| Committed step / turn | One bounded 280 / 220 ms hand settle; ≤3 px travel and <0.4° roll | Blocked movement causes no walking cue; camera unchanged |
| Mechanism | Brace → reach → settle, 650 ms | Starts only after controller accepts interaction |
| Inspect / counter | Held inspection pose, 800 ms | Textual result remains immediately readable |
| Pickup / use | Contextual held/inspection pose, 650 ms | Inventory transaction has already committed once |
| Combat attack / support / defend | Resolving protagonist's strike / support / brace | Same clock as existing combat cue; no action callbacks |
| Hurt | Recoil pose for HP loss, then a persistent guarded pose below 30% HP | Health is copied; presentation cannot inflict damage |
| Distress | Static tension pose below 30% SAN | No hidden navigation, perception or difficulty changes |

Combat anticipation ends at 143 ms, contact at 403 ms, recovery at 650 ms. Enemy hit numbers/reactions and party hit/heal reactions start at the shared contact marker. Authoritative HP, turn and accessible log commit immediately. No input is delayed for animation. Repeated actions replace the transient cue rather than enqueue gameplay callbacks. Injury takes precedence over distress at rest.

## Motion and accessibility

Reduced motion keeps the stable action pose and timing but removes breathing, translation and roll. HP/SAN, labels, action results and combat logs are DOM/text equivalents. Injury and distress have readable static poses and words. No required information relies on movement, color or audio. Camera bob, full-screen shake, blur, chromatic aberration, reticles and timing challenges are excluded.

Inspection and use currently show authored empty-hand gestures; no unearned inventory prop is painted into the overlay. Contextual held-object variants remain a future art extension, not a gameplay promise.

Eight distinct hand key poses are a limited-pose acting system, not continuous skeletal or video-derived animation. The installed video workflow currently has no configured provider/CLI route; retain capability evidence and the motion acceptance gate. Do not inflate animation counts with duplicate frames. Per-character body atlases, portrait crops, hand metadata, source lineage and build checks are separate from runtime acting.

## Acceptance

Use the evidence bundle in `evidence/phase01b/` for actual browser, native-scale, grayscale, mobile, reduced-motion and motion review. Inspect all four together with Keeper/Guard. Confirm center clearance, grounded body pivots, anatomy, loop/transition stability, contextual held-object plausibility and the 143 ms response marker. Physical phone, human listening/reader/playtest, subjective art acceptance and unresolved legacy rights remain separate open gates. Phase 02 expansion and deployment are outside this phase.
