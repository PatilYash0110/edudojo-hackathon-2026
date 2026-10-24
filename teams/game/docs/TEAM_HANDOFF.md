# EduDojo Team Handoff

## Product boundary

- **The Backend Team's OpenMAIC runtime remains the learning engine.** It owns generated lessons, narration, interactive learning, and lesson completion inside the game flow.
- **The game layer wraps OpenMAIC.** It owns the tower map, floor locks, return-to-dojo loop, battles, and the Final Boss mastery gate.
- One user input creates one Dojo topic. Its OpenMAIC learning sections become tower floors; the Final Boss draws from every objective in that input.
- The prototype mock scenes occupy an embedded runtime slot. Replace that slot with the Backend Team's player and emit `LESSON_COMPLETED`; never navigate to the existing OpenMAIC course library from the game.

## What is already playable

- One complete 1v1 turn loop with player and enemy HP.
- Heavy Strike: one question, one heavy hit.
- Three-Hit Combo: one hit for every correct answer, up to three hits.
- Knowledge Blast: five questions; 3/5 releases the attack, otherwise the player takes backlash damage.
- Block, Parry & Counter, and Dodge with knowledge checks and timing windows.
- Cooldowns, victory, defeat, restart, German sample questions, and an English Dev Set.
- A player equipment selector with a Training Katana and a transparent Dragon Fang test sprite.
- A persistent tower flow: OpenMAIC lesson → floor battle → next OpenMAIC lesson → Final Boss.
- A simple player marker that walks with `A/D`, changes floors with `W/S`, and enters an open door automatically on contact; locked doors remain inaccessible.
- A room-entry transition where the guardian jumps into the dojo and combat starts automatically, plus automatic teleport to the next lesson after a win.
- A fixed combat camera, simple capsule placeholders, and a clean reference sword-swipe effect for testing timing and direction.

## Game Team — remaining work

1. **Lock the battle rules.** Confirm HP, damage, cooldowns, timing windows, failed-answer penalties, and victory conditions after five short playtests.
2. **Define the learning loop.** Write the exact state flow: Dojo lesson → floor battle → feedback → next lesson → Final Boss.
3. **Create the floor data.** For every topic, provide the learning objective, required mastery, enemy behavior, available attacks, and reward.
4. **Define the Final Boss.** Specify the Sensei transformation, phase triggers, mixed-topic question rules, weak-topic targeting, and final mastery result.
5. **Write the content contract for Backend.** Define the fields needed for prompt, answer type, grading result, explanation, objective ID, difficulty, and timeout.
6. **Create balance test cases.** Include 0/3, 1/3, 2/3, and 3/3 Combo results; 0–5 Quiz results; successful and failed defenses; cooldown conflicts; restart during an attack.
7. **Prepare a playtest sheet.** Record time per turn, answer accuracy, missed timing windows, damage taken, and whether players understand why they won or lost.
8. **Deliver effect timing to Frontend.** Provide one small table with animation name, impact timestamp, damage timestamp, and recovery end time.

## Frontend Team — remaining work

1. **Create only two production characters.** One apprentice and one floor guardian are enough for the first integration. Reuse the guardian rig for the Sensei boss until the combat loop is approved.
2. **Deliver the source and runtime assets.** Put editable `.blend` files in `assets/source/characters/` and exported files in `public/models/dojo/`. Deliver `apprentice.glb`, `guardian.glb`, and one shared `katana.glb`.
3. **Use one shared humanoid skeleton.** Keep names and hierarchy identical across both characters so the same clips can be reused. Add `WeaponSocket_R` under the right-hand bone and a `SwordTip` node at the blade tip.
4. **Build the fixed combat scene.** Lock the camera, player mark, enemy mark, ground plane, and light positions before polishing characters. Keep the current left-foreground/right-background composition.
5. **Implement the animation state machine.** Required states: `Idle`, `Heavy`, `Combo1`, `Combo2`, `Combo3`, `Charge`, `Hit`, `Block`, `Parry`, `Dodge`, `Defeat`, and `BossTransform`.
6. **Author readable attack clips.** Every attack needs three clear phases: anticipation, contact, and recovery. Enemy attacks need a longer anticipation than player attacks so Block, Parry, and Dodge remain readable.
7. **Synchronize contact events.** Store one contact time for each clip in a small TypeScript metadata file. Apply damage, start recoil, play the hit sound, and begin the hit pause from that same timestamp.
8. **Build the reference sword swipe.** Sample `SwordTip` every rendered frame, create one curved ribbon from the recent positions, make the newest edge bright and wide, fade the oldest vertices to alpha zero, then remove the ribbon after 250–400 ms.
9. **Match both directions.** Player and enemy use the same swipe system with mirrored direction and different colors. The enemy swipe must be just as visible and smooth as the player swipe.
10. **Add restrained impact feedback.** Freeze both AnimationMixers for 60–75 ms on contact, move the camera 2–4 px once, and use a small recoil. Do not add particles or post-processing yet.
11. **Connect existing battle events.** The scene consumes the Game Team action IDs and state. Keep HP, cooldown, answer scoring, and turn logic in the battle engine.
12. **Add loading and failure states.** Preload both GLBs before enabling combat. If a model fails, show the current capsule placeholder and log the missing asset name.
13. **Finish responsive layout.** Validate desktop at 1440×900 and one mobile layout at 390×844. Questions and commands must stay readable without moving the combat camera during an attack.
14. **Add minimal audio.** Deliver one sword whoosh, one hit, one block/parry, and one charge sound. Trigger each from the same clip metadata used for contact.
15. **Profile before polish.** Test model size, texture memory, loading time, and frame time on a normal laptop. Keep post-processing disabled until the page holds 60 fps during Combo3.
16. **Keep characters alive while idle.** Make a 1.8–2.5 second looping idle with a small weight shift or hop, slight squash/stretch, and a matching shadow change. Offset the enemy loop so both characters do not move in sync.
17. **Replace the temporary drag orbit.** Add horizontal pointer/touch orbit around the fixed battle center. Clamp azimuth to ±10°, disable zoom and pan, keep the HUD screen-aligned, and preserve the selected angle between turns.
18. **Replace the temporary equipment sprite.** Export each production weapon as GLB, keep its origin at the grip, attach it to `WeaponSocket_R`, and expose it through the same equipment selector. The current Dragon Fang PNG only proves swap, scale, and animation timing.

## Frontend asset contract

| Item | Required value |
| --- | --- |
| World scale | 1 unit = 1 meter; character height about 1.7 units |
| Axes | Y up; character faces +Z in Blender before export |
| Origins | Character origin centered between the feet; sword origin at the grip |
| Skeleton | One shared humanoid hierarchy; about 60 bones or fewer |
| Sockets | `WeaponSocket_R` on the right hand; `SwordTip` at the end of the blade |
| Materials | Principled BSDF; one material per character where possible |
| Textures | One 1024×1024 base-color texture per character for the prototype |
| Export | GLB with mesh, skin, textures, and named animation clips |
| Clip loop | Only `Idle` loops; attacks and reactions use `LoopOnce` and `clampWhenFinished` |
| Runtime | `GLTFLoader` + `AnimationMixer`; 80–120 ms cross-fade into attacks |
| Rendering | Fixed camera, one key light, one fill light, DPR capped at 1.5, no post-processing |

Create `teams/frontend/features/battle/animation-events.ts` with one entry per clip:

```ts
export const CLIP_EVENTS = {
  Heavy: { contact: 0.46, recover: 1.2 },
  Combo1: { contact: 0.36, recover: 0.72 },
  Hit: { contact: 0, recover: 0.34 },
} as const;
```

Values are seconds from the start of the clip. Frontend may adjust them to the final exported animations, but damage and visual contact must continue to use the same value.

## Recommended 3D model workflow

Use **Blender → Mixamo → Blender → GLB → Three.js**.

1. Model or modify a humanoid in **Blender** in a neutral A-pose. Apply scale and rotation, keep the origin at the feet, and use a simple game-ready topology.
2. Use one 1024×1024 texture set per character for the hackathon. Blender materials should use Principled BSDF.
3. Upload an FBX to **Mixamo** for quick humanoid auto-rigging and base locomotion. Mixamo accepts FBX, OBJ, or ZIP for an unrigged character, and its auto-rigger is intended for humanoid characters.
4. Bring the rigged character back into Blender. Make or refine the sword-specific clips there; Mixamo is useful for idle, hit and dodge bases, but the heavy slash, combo, parry, and Sensei transformation need manual animation.
5. Put each action in its own Blender Action/NLA track and use these exact clip names: `Idle`, `Heavy`, `Combo1`, `Combo2`, `Combo3`, `Charge`, `Hit`, `Block`, `Parry`, `Dodge`, `Defeat`, `BossTransform`.
6. Parent the sword to `WeaponSocket_R`, verify that `SwordTip` stays at the end of the blade throughout every attack, and test that the weapon does not slide in the hand.
7. Export one `.glb` per character with mesh, skeleton, textures, and animation clips. GLB is the easiest handoff because it packages the asset in one file.
8. Load it with the already-installed **Three.js** `GLTFLoader` and play clips with `AnimationMixer`. Do not add another rendering framework until one animated GLB works correctly in the current page.

Prototype budget per character:

- 20k–35k triangles.
- One 1024×1024 base-color texture; add normal/roughness only if the visual gain is clear.
- About 60 bones or fewer.
- Target under 3 MB per compressed GLB where practical.
- One player, one guardian, one weapon, one fixed camera.

Official references:

- [Blender glTF 2.0 export](https://docs.blender.org/manual/en/4.0/addons/import_export/scene_gltf2.html)
- [Adobe Mixamo auto-rigging](https://helpx.adobe.com/creative-cloud/help/mixamo-rigging-animation.html)
- [Three.js GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html)
- [Three.js AnimationMixer](https://threejs.org/docs/pages/AnimationMixer.html)

## Definition of done for the next integration

- One player GLB and one enemy GLB load on `/dojo`.
- Heavy, two-hit Combo, three-hit Combo, Hit, Block, Parry, and Dodge play the correct clip.
- The swipe follows the sword direction and fades behind the blade.
- Both characters have asynchronous idle movement, and drag orbit stays within ±10°.
- HP changes exactly on the contact frame.
- German and English Dev Sets produce identical battle results.
- Restart cancels active clips and returns both characters to Idle.
