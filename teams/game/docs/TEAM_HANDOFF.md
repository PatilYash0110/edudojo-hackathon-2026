# EduDojo Team Handoff

## Product boundary

- **The Backend Team's OpenMAIC runtime remains the learning engine.** It owns generated lessons, narration, interactive learning, and lesson completion inside the game flow.
- **The game layer wraps OpenMAIC.** It owns the 2D tower map, floor locks, return-to-dojo loop, battles, and Final Boss mastery gate.
- One user input creates one Dojo topic. Its OpenMAIC sections become tower floors; the Final Boss draws from every objective in that input.
- The mock lesson scenes occupy an embedded runtime slot. Backend replaces that slot and emits `LESSON_COMPLETED`; the game never navigates to the existing OpenMAIC course library.

## Technical direction: 2D only

- The tower and combat use a fixed 2D side view. There is no orbit camera, perspective transform, 3D scene, GLB, skeleton, or Three.js requirement.
- Character art is transparent PNG or WebP. Animation may use frame-by-frame sprite sheets or small layered cutouts animated with CSS transforms.
- The current capsules are placement and timing placeholders. Frontend replaces their art without changing battle rules.
- Combat logic remains in `teams/game`; visual components only consume battle state, action IDs, timing, and damage events.

## What is already playable

- Heavy Strike: one question and one heavy hit.
- Three-Hit Combo: one hit for each correct answer, up to three hits.
- Knowledge Blast: five questions; 3/5 releases the attack, otherwise the player takes backlash damage.
- Block, Parry & Counter, and Dodge with knowledge checks and timing windows.
- A 3.2-second technique-selection window that auto-locks the highlighted legal move, plus a 9-second answer timer.
- Close-range face-off movement, three rotating guard/feint poses, and alternate player/enemy strike motions.
- Cooldowns, HP, victory, defeat, restart, German sample questions, and an English Dev Set.
- A player equipment selector with a Training Katana and a transparent Dragon Fang test sprite.
- Persistent flow: embedded OpenMAIC lesson → room entry → floor battle → next lesson → Final Boss.
- The tower marker walks with `A/D`, changes floors with `W/S`, and enters open doors automatically.
- Winning teleports the learner directly to the next lesson.

## Game Team — remaining work

1. Confirm HP, damage, cooldowns, timing windows, failed-answer penalties, and victory conditions after short playtests.
2. Define each floor's learning objective, mastery threshold, enemy behavior, available attacks, and reward.
3. Specify the Final Boss phases, mixed-topic question rules, weak-topic targeting, and final mastery result.
4. Finalize the Backend question contract: prompt, answer type, options, accepted answers, explanation, objective ID, difficulty, and timeout.
5. Deliver an animation timing table with action ID, anticipation, contact, damage, and recovery timestamps.
6. Test Combo scores 0–3, Blast scores 0–5, every defense result, cooldown conflicts, timeout auto-lock, and restart during an action.

## Frontend Team — remaining work

1. Draw two production characters: one apprentice and one guardian. Reuse the guardian palette/shape for the Sensei boss until gameplay is approved.
2. Deliver editable source files in `assets/source/sprites/dojo/` and runtime PNG/WebP files in `public/sprites/dojo/`.
3. Use the same canvas size and foot anchor for both characters so every pose occupies the current actor box without layout changes.
4. Provide these states: `IdleHigh`, `IdleLow`, `IdleFeint`, `FaceOffDash`, `HeavyOverhead`, `HeavyReverse`, `HeavySpin`, `Combo1`, `Combo2`, `Combo3`, `Charge`, `Hit`, `Block`, `Parry`, `Dodge`, `Defeat`, and `BossTransform`.
5. Draw attacks with anticipation, contact, and recovery. Enemy anticipation must remain longer so Block, Parry, and Dodge are readable.
6. Keep the sword on a separate transparent layer with a fixed grip anchor. This lets the same character poses test different equipment.
7. Keep attack direction readable in silhouette. Player attacks travel left-to-right; enemy attacks mirror them.
8. Use the existing curved swipe layer. Replace its temporary color and width only after final sword art is in place.
9. Keep impact feedback restrained: 60–75 ms hit pause, one small screen shake, one recoil, and a short contact flash.
10. Preload sprite atlases before combat. If an asset fails, retain the capsule placeholder and log the missing asset path.
11. Validate desktop at 1440×900 and mobile at 390×844. Questions and commands must not cover both fighters at once.
12. Keep animation at 60 fps on a normal laptop. Avoid a new game engine until the DOM/CSS implementation becomes a measured bottleneck.

## 2D sprite contract

| Item | Required value |
| --- | --- |
| Runtime format | Transparent WebP preferred; PNG accepted |
| Source format | Aseprite, Krita, Photoshop, Figma, or layered SVG |
| Character canvas | 512×512 px per frame |
| Weapon canvas | 512×512 px with grip anchor metadata |
| Facing | Player faces right; enemy source art faces left |
| Foot anchor | `x: 0.5, y: 0.92` normalized to the frame |
| Grip anchor | Named `weaponGrip`, stored as normalized x/y per frame |
| Frame rate | 12 fps idle; 18–24 fps attacks |
| Atlas limit | 2048×2048 px per character atlas |
| Export size | Target under 1.5 MB per character atlas |
| Filtering | Smooth for illustrated art; pixelated only for intentional pixel art |
| Looping | Idle states loop; attacks, reactions, and defeat play once |

Create `teams/frontend/features/battle/sprite-events.ts` with one entry per clip:

```ts
export const SPRITE_EVENTS = {
  HeavyOverhead: { frames: 18, fps: 20, contactFrames: [8], loop: false },
  Combo1: { frames: 12, fps: 20, contactFrames: [6], loop: false },
  Hit: { frames: 8, fps: 18, contactFrames: [0], loop: false },
} as const;
```

Damage, hit pause, sound, recoil, and swipe contact must all use the same `contactFrames` entry.

## Recommended 2D workflow

1. Draw the character on a 512×512 transparent canvas with feet aligned to the shared foot anchor.
2. Produce three idle/guard loops first. Confirm scale and face-off spacing in the browser before drawing attacks.
3. Draw Heavy, Combo, Charge, Hit, Block, Parry, Dodge, and Defeat as separate frame sequences.
4. Export individual WebP frames during iteration. Pack them into one atlas only after timing is stable.
5. Keep sword art separate and record the grip point for each character frame.
6. Add frame counts and contact frames to `sprite-events.ts`.
7. Replace the temporary `.playerSprite` and `.enemySprite` backgrounds with the exported art while keeping the current actor wrappers and state attributes.
8. Test every action in both directions, then compress the final atlases.

## Definition of done for the next integration

- One apprentice atlas and one guardian atlas load on the combat page.
- Every required state plays through the existing `data-motion`, `data-stance`, `data-kind`, and `data-variant` hooks.
- Heavy, Combo, Hit, Block, Parry, and Dodge apply damage on the declared contact frame.
- Both characters keep moving during selection and questions without drifting from the foot anchor.
- Player and enemy sword swipes mirror correctly.
- German and English Dev Sets produce identical battle results.
- Restart cancels the active sequence and returns both sprites to their opening guard state.
