# FRONTEND TEAM — game assets

`backgrounds/` per floor, `sprites/` fighters, `avatars/` characters, `audio/` music + SFX, `ui/` icons.
TODO: naming convention with the Game Team.

## From the Frontend-design repo (PatilYash0110/Frontend-design)

- `fighters/<id>/<clip>.webp`: rig-based "character_animation" v2 sprites (branch
  `character-animations-v2`, `output/sprites/<Figur>/<clip>/frame_XX.png`), packed as horizontal strips
  of 640×480 frames facing right, feet on the anchor (250, 462). Clips: idle 12 @10fps, jab 8 @14,
  heavy 10 @12, special 12 @12, hurt 6 @12, block 8 @12; impact frames from the v2 `manifest.json`
  (see `teams/frontend/features/battle/fighter-roster.ts`). Source → id: Magician_m → monk (hero),
  Street_m → brawler, Ninja_f → ninja, Suit_f → valkyrie, Magician_f → storm, Smash_m → colossus (boss).
  To re-pack after a new render: concatenate each clip's frames left to right, save as WebP (quality 88).
  The v2 `integration/AnimatedFighter.tsx` is not used here; `SpriteFighter.tsx` plays these strips.
- `maps/floor-1..5.webp`, `maps/final.webp`: "Maps" folder, 1920×900 with the baked caption box cropped
  off the bottom; `-small.webp` (768 wide) are used on the tower's back walls.
- The tower page (`teams/frontend/features/dojo-map/tower-*.ts`) is a port of "EduDOJO Tower.zip".
