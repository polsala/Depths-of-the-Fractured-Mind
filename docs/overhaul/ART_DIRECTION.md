# Art direction — institutional ritual

Status: committed production direction, **not visual sign-off**. Existing screenshots document deficiencies; no replacement art is produced in Phase 00. Retain the four canonical identities and the useful [hero atlas contract](../hero-art-bible.md). [Provenance ledger](ASSET_PROVENANCE.json) governs asset status independently of appearance.

## Architectural language and scale

The Facility is a late-20th-century concrete institution organized around control: repeated rectangular bays, thick lintels, recessed service seams, narrow observation apertures and numbered thresholds. Door frames have visible weight. Public-facing walls are painted and maintained; service-side concrete and exposed fixings reveal how the place operates. Break symmetry only when a human action or structural failure explains it.

Design metrics for the slice: one grid cell = 2 metres; eye height = 1.6 m; typical ceiling = 2.8 m; door opening = 1.1 m wide by 2.2 m high inside a cell; corridors = one cell with occasional two-cell passing bays; rooms = 3×3 to 5×4 usable cells, with a 5×5 admissions room to frame the landmark. These are target physical relationships, not a claim that the existing `height / distance` renderer already implements metric projection. First renderer work must unify its camera/floor/wall scale. A human silhouette should read as 1.55–1.9 m; props must not expand to fill a cell because an image is square.

Use an orthogonal grid for collision and perspective; make depth readable through foreground framing, middle-distance landmarks and receding structural rhythm. Ceiling beams, wall thickness, door recesses and grounded shadows establish volume. No arbitrary diagonal geometry is required for the first slice. Architecture must hold up while the camera moves, not only at resting positions.

## Materials and texture treatment

The core family is painted concrete, chipped enamel steel, worn linoleum, wired safety glass, paper and restrained organic intrusion. Materials tell use and age: abrasion at handles and thresholds; leaks below pipes; clean rectangles where notices were removed. Place wear through authored masks/decals, not uniform crack noise across every surface.

Author tileable surfaces at 128 texels per world metre, normally a 256×256 texture per 2 m structural module. Validate repeats over a 3×3 wall and a 12-cell corridor at near and far distances. Favor broad value groups and intentional pixel clusters over photographic noise. No baked perspective, baked signage text, inconsistent light direction or highlights that fight runtime lighting. Runtime WebP remains the default for opaque surfaces; PNG for true-alpha atlases. Check compressed surfaces at native display sizes. Source PNGs remain separate.

Use three detail frequencies: large structural divisions, medium seams/fixtures and sparse fine wear. Large forms must survive a 390 px screen. Avoid putting attention-grabbing scratches on all three frequencies everywhere.

## Light, value and color hierarchy

Light reveals function. The navigation route and a required interaction occupy the clearest value separation; optional traces are quieter; the periphery carries uncertainty. Use local pools from fluorescent housings, desk lamps and security apertures, with warm/cool separation. Keep a low readable ambient floor instead of crushing every unlit surface. Darkness never changes legal moves or hides an unavoidable attack.

Default composition target: roughly 65% quiet neutral mass, 25% secondary structure and 10% focal accent. Treat these as composition guidance, not a histogram achievement test. Required interactables need a distinct contour, label/prompt and value separation, including in grayscale. Color is supplementary. No full-screen bloom; any small emissive halo stays within its source's immediate surroundings and must survive the effects-off setting.

| Depth | Base / secondary / focal palette | Material and silhouette variation | Mandatory landmark target |
| --- | --- | --- | --- |
| 1 Threshold | soot `#121b23`, institutional green-gray `#52605b`, bone `#c7c1aa`; sparse release amber `#d5a45b` | Heavy security lintels, green enamel lower walls, horizontal queue rails | Four-slot patient counter above the intake return point |
| 2 Archive | umber `#2c231d`, paper `#a99b7c`, faded ink `#4b6970`; task amber `#d2ad69` | Filing ribs, hanging tabs, tall compressed verticals | Open records drum with one missing segment |
| 3 Ward | dark green `#182820`, oxidized mint `#718c7e`, clinical bone `#d2d2b7`; alarm rust `#ae6054` | Rounded enamel equipment within rigid bays, suspended service lines | Three occupied bays joined to one pressure manifold |
| 4 Labyrinth | ink violet `#211d30`, desaturated silver `#8e98a7`, cold cyan `#9dc7ce`; confession mauve `#a886a2` | Paired frames, alternating reflective and opaque planes | Split observation window with a physically stable central mullion |
| 5 Core | charcoal `#261e20`, iron red `#713e43`, ash `#ada691`; living pulse `#ce7464` | Ribbed steel carrying restrained tissue forms; converging scale | Heart pressure chamber seen through three progressively larger ribs |

These extend the current five palette identities; they do not replace identity with five color filters. Materials, spacing, sounds and landmarks must also differ.

## People, enemies and sprite perspective

Keep Elias's compact security silhouette, Miriam's narrow coat, Subject 13's bandaged/pallid form and Anya's tall hood. Use their established slate, bone/burgundy, olive and teal accents. Distinguish them in silhouette and grayscale at 48–64 px portrait height.

World sprites use a level camera, vertical feet-down posture and no baked isometric ground plane. Ground the foot pivot at `(0.5, 0.92)` of a frame; sort and occlude against real scene depth. Scale from world height and camera projection, never a screen-space minimum that makes a distant person grow. Present front/side/back views where available; a billboard's artistic perspective must match the level horizon. For the slice, one coherent facing set is acceptable; lack of direction variants must be explicit.

Preserve the current 512×512 hero atlas with 128×160 cells and animation names until replacement art has evidence. Full-body reference density target: 128 px of authored height for a 1.75 m person; meaningful features use readable pixel clusters. Portraits are separate compositions or careful crops, not arbitrary whole figures enlarged to card size. Avoid fractional enlargement in HUD portraits; world projection may resample at fractional sizes, with no temporal edge crawl at walking speed. Use nearest filtering for pixel sprites; choose consistent distance filtering for surfaces after in-motion comparison. Do not force the existing soft source sheets into a false claim of crisp pixel art.

Enemies should have the same edge language, broad value masses and lighting response as the party and environment. Current code-authored silhouettes preserve readable identities and can be used as explicit placeholders. Neon vector outlines beside soft shaded protagonists do not satisfy the final compatibility gate. Redraw one guard and one hero reference in the actual intake room before scaling the family. No new creature types needed to prove the slice.

Animation priorities: anticipation, distinct impact pose, readable recovery, stable feet and silhouette. Current reused-pose atlas states are functional evidence, not proof of final animation. Capture idle → action → hit → death at game scale, normal and reduced motion. Do not wobble the entire sprite as a substitute for acting.

## UI typography and HUD composition

Use the current local system sans stack for readable prose and controls; reserve a system monospace for short case numbers and mechanical readouts. No external font dependency in the slice. Use a restrained title treatment derived from intake signage. Body copy starts at 16 CSS px, labels at 14 px, with 1.4–1.6 line height; essential information must remain usable at 200% text. Canvas labels need DOM equivalents and independent native-size review.

Desktop at 1280×900: the dungeon is the primary field; compact objective/compass above, four compact party summaries along a consistent edge, actions reachable without scrolling away from the view. Inventory and party detail open as focus-managed dialogs. Avoid a sidebar that stretches the viewport's parent to several screen heights. Mobile at 390×844: concise objective, 4:3 world, touch controls below the world, compact party summary and context action. Details can scroll inside an intentional disclosure or dialog. Preserve 320 and 768 px reflow, 44 px touch targets, safe-area padding and clear focus.

Use one border weight, one spacing rhythm (4/8/16/24), muted ink surfaces and a single amber active-state accent. HP, SAN, danger and relationship consequences use text/icons as well as color. Remove debug controls from player-facing production screens in a dedicated later change, retaining an explicit QA route for benchmarks. The current title import overlap is a blocking defect, not a new UI pattern to preserve.

## Atmosphere and perception

Use local fog only when it separates depth layers; avoid an opaque screen wash. Dust belongs in a light shaft, condensation near a cold surface, and a drip below a source. Allow sparse idle motion while pausing nonessential effects on hidden tabs. No mandatory camera bob, shake, chromatic aberration, flashing light or blur. Reduced-motion/effects-off must preserve cues and timing options.

Sanity imagery has a consistent uncertain treatment: displaced duplicate contour, cold tint and a concise perception log. A label or accessible description makes the uncertainty available without color or animation. Real required mechanisms retain stable shapes. The first moment is the optional fifth queue shadow in the slice; avoid full-screen glitches that obscure the next action.

## Explicit anti-patterns and rejection tests

| Reject | In-context rejection condition |
| --- | --- |
| Generic corridors | Two sequential screenshots cannot be distinguished by landmark, function or spatial rhythm |
| Flat lighting | Path, landmark and secondary structure have the same emphasis |
| Asset-style mismatch | A person, enemy and wall appear to come from unrelated rendering styles |
| Excessive bloom | Emissive effects erase silhouettes, typography or material boundaries |
| Unreadable darkness | A required door, threat or interaction cannot be found at normal brightness without brightening the image |
| Muddy sprites | Face/limb mass, facing or alive/fallen state is unclear at native scale |
| Arbitrary clutter | A prop has no former use, narrative trace, navigation role or interaction purpose |
| Repeated rooms | A room offers the same arrangement, task and emotional beat as its predecessor |

Approval requires desktop/mobile images, native sprite crops, grayscale readability, a continuous walk video and a human art/QA review against these conditions. A beautiful still or a passing accessibility scan alone does not close the gate.
