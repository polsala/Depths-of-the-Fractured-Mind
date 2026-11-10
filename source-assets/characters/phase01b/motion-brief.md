# Phase01B cast key-pose brief

These are generated limited-key-pose review candidates. They are not claimed to be video-derived animation. `forge-doctor.json` in the ignored run artifacts reports a usable host image route and **no video route**: xAI/BytePlus/fal keys are not configured and Grok CLI is absent. `route_media.py resolve --kind video` returned `status:no-route`. The full installed video workflow was read and its capability/ffmpeg doctor evaluated; it could not produce clips. The user requires implementation and permits limited-frame animation, so distinct pose reference sequences were created with the host image tool and normalized deterministically. Human motion acceptance remains open.

All four use the same index vocabulary, 128×160 cells,124px standing height, native alpha and one fixed source scale/horizontal root per character. `registration.json` retains inspected contact lines; it never resizes a fallen pose to its box. Source images are preserved untouched. Low-alpha output fringe is rejected at source alpha128 and binary area coverage0.5; no largest-component deletion, torso clamping or color-specific erasure is used. An initial Elias downed pose reached output column0 and was rejected by the existing safe-margin requirement. The shared Elias horizontal torso origin was corrected157→154.5 for every pose, preserving body scale. The final build passes.

| Frame | Pose | Elias | Miriam | Subject13 | Anya |
| --- | --- | --- | --- | --- | --- |
| 0 | Neutral | Guarded palm at coat | Precise hand at sternum | Protects ribs | Holds plain prayer cord low |
| 1 | Breath | Chest/eyelid change | Breath/eyelid change | Anxious inhale | Quiet breath |
| 2 | Alert/talk | Terse open command | Precise open address | Warning with raised hand | Measured open address |
| 3 | Anticipation | Loads baton behind body | Loads precise palm strike | Coils open hand inward | Palm gathers at chest |
| 4 | Contact | Planted baton thrust | Planted palm strike | Reaching palm thrust | Warding palm |
| 5 | Recovery | Baton lowers | Arms return low | Shoulders soften | Robe/hand settles |
| 6 | Support anticipation | Palm gathers at chest | Gathers dressing | Hands near sternum | Hands join at chest |
| 7 | Support contact | Firm command palm | Offers dressing | Pushes away a memory | Open inviting palms |
| 8 | Support recovery | Returns to guarded stance | Hands lower | Hands fold inward | Hands join low |
| 9 | Brace | Baton/forearms guard torso | Forearms protect chest | Crosses arms over chest | Bows inside hood |
| 10 | Hurt | Recoils and grimaces | Recoil/wince | Recoils, visible eye strained | Recoil/wince |
| 11 | Stress | Presses forehead | Hand at temple | Hands press temples | Covers mouth, holds cord |
| 12–15 | Downed | Buckle/kneel/sideways/settle | Buckle/kneel/sideways/settle | Buckle/kneel/sideways/settle | Bow/kneel/sideways/settle |

Attack/support use143ms anticipation,260ms contact and247ms recovery, matching the shared650ms combat presentation clock. These holds do not apply damage or defer gameplay. Hit uses150ms recoil then250ms recovery. Defeat uses140/160/180/170ms then holds the final drawing. Reduced motion retains first stable action pose and final settled defeat. Directional `walk*` names remain compatibility aliases for frontal restrained stance; no directional locomotion art is claimed. Exploration translation remains authoritative grid/camera motion.

`master_still.py approve` records technical master selection/padding only. Its verb is not a human artistic approval. Every actual generation prompt and output lineage is retained in `generation-record.json`; the script-written planning prompts are separate from the actual transparent-output host prompts. Backend model ID, provider seed and billed cost were not exposed and are not invented.
