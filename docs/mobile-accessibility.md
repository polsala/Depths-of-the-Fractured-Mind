# Mobile and accessibility baseline (pack 07)

## Controls and supported layouts

- Keyboard exploration: W/Up forward, S/Down back, A/Left and D/Right strafe, Q/E turn, T talk. Tab/Shift+Tab traverse buttons and menus; Enter/Space activates focused controls. Movement shortcuts do not fire while a form control, link, disclosure, or dialog has focus.
- At widths below 768 CSS px, the six touch buttons sit **below** the first-person view rather than over the minimap or other content. They are native buttons with accessible names and at least 44×44 CSS px targets.
- Exploration, event, inventory, combat, title and Continue have been exercised at 320, 390 and 768 px. Text-size settings go to 200%; browser pinch zoom is allowed. The responsive tests assert no horizontal document overflow and save screenshots as CI artifacts.
- The Canvas combat scene has a visible text equivalent with round, each enemy's HP/status/telegraphed ability and target, and every party member's HP/Sanity/status. The exploration view has a labelled position/direction and a non-color map legend; party stats also have a screen-reader text equivalent.

## Preferences and dialogs

The Settings disclosure is available on every screen. Music and SFX volume (including zero/mute), motion (`Follow device`, `Reduce`, `Full`) and text size persist in browser storage independently of the run save. If storage is disabled, safe defaults apply for that session. Reduced motion also follows the OS preference by default; combat effects can be switched off immediately. Audio is never the sole source of essential damage/status information.

Inventory, party status, equipment, minimap, chest and combat dialogs have an accessible name, initial keyboard focus, Escape dismissal where appropriate, Tab containment and focus return to the opener. Victory requires an explicit Continue action. The settings disclosure is nonmodal and closes with Escape.

## Verification and remaining gates

- `npm run ci` runs TypeScript, build, event validation, unit tests, Playwright Chromium, axe-core WCAG 2.0/2.1 A/AA checks for title/exploration/event/combat, and dependency audit. Browser screenshots are uploaded from `test-results` on CI.
- Deterministic touch tests exercise event choice → inventory → save/return → Continue, plus a combat attack and enemy selection. They seed event/combat checkpoints; they are **not** evidence of an unassisted human journey through generated maps.
- Pending before closing #47/#54: manual checks on a physical iOS/Android browser (including landscape and safe areas), a full unaided touch run, and a human keyboard + screen-reader pass (NVDA/VoiceOver) through the vertical slice. Record browser/device, blocking issue, severity and follow-up. Automated axe checks cannot establish screen-reader usability by themselves.
- The optional developer/debug panel is still visible in production; pack 09/#50 owns its removal.
