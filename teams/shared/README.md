# teams/shared — ALL TEAMS

The handshake between teams: placeholder types + the API path list.

| File | What |
| --- | --- |
| `contracts/dojo.ts` | Dojo, Floor, LearningObjective, Boss |
| `contracts/challenge.ts` | quiz, short answer, code, simulation, project, debate |
| `contracts/progress.ts` | users/roles, profile, mastery, grades |
| `contracts/battle.ts` | battle session, rewards, client-safe `BattleQuestion`, grading |
| `contracts/lesson.ts` | `LESSON_COMPLETED` event from the embedded lesson runtime |
| `contracts/dojo-source.ts` | `DojoSource`: the single data boundary (demo or live) every game screen uses |
| `contracts/agents.ts` | Sensei / Rival / Classmate / Boss messages |
| `contracts/social.ts` | chat, leaderboard |
| `contracts/analytics.ts` | dashboard payloads |
| `contracts/api-routes.ts` | every `/api/dojo/*` path |
| `todo.ts` | `todo()` helper for stubs |

Day 1, everyone together: finalize these types. After that, any change needs one reviewer from each team.
No logic here, and no imports from other team folders.
