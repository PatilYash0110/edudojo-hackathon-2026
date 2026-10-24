# teams/game — GAME TEAM

Learning design + gameplay rules, as **pure TypeScript** (no React, no Next.js, no database). Frontend runs it in the
browser for the battle, and Backend runs it to compute rewards and mastery. May import only `teams/shared`.

| Sub-folder | What | Owner |
| --- | --- | --- |
| `docs/GAME_DESIGN.md` | the design doc (fill first) | _name_ |
| `balance/` | every number: HP, damage, XP curve, timers, thresholds | _name_ |
| `battle/` | battle reducer, skills | _name_ |
| `boss/` | Final Boss phases, victory conditions | _name_ |
| `progression/` | XP/levels, rewards, unlocks, achievements, start/end game | _name_ |
| `mastery/` | mastery rules, adaptive difficulty | _name_ |
| `characters/` | one file per character: Sensei, Rival, Classmate, Boss | _name_ |
| `content/` | floor blueprints, question templates, enemies, story, dialogue, demo dojo | _name_ |
| `tests/` | `it.todo` lists to turn into tests | everyone |
