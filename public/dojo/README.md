# FRONTEND TEAM — game assets

`backgrounds/` per floor, `sprites/` fighters, `avatars/` characters, `audio/` music + SFX, `ui/` icons.
TODO: naming convention with the Game Team.

## From the Frontend-design repo (PatilYash0110/Frontend-design)

- `fighters/<id>/<clip>.webp`: "Dojo_Animationen_Teil_1-3" sprites, packed as horizontal strips of
  300px square frames facing right. Clips: idle 12, jab 8, heavy 10, special 12, hurt 6, block 8 frames
  (see `teams/frontend/features/battle/fighter-roster.ts`). Source → id: Magician_m → monk (hero),
  Street_m → brawler, Ninja_f → ninja, Suit_f → valkyrie, Magician_f → storm, Smash_m → colossus (boss).
- `maps/floor-1..5.webp`, `maps/final.webp`: "Maps" folder, 1920×900 with the baked caption box cropped
  off the bottom; `-small.webp` (768 wide) are used on the tower's back walls.
- The tower page (`teams/frontend/features/dojo-map/tower-*.ts`) is a port of "EduDOJO Tower.zip".
