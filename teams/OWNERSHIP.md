# Team ownership — who does what

This is the binding declaration of ownership for the hackathon. If a file or decision isn't listed here, the three
team leads decide together.

**Fill in names first.** Every role is a slot. In a small team one person holds several slots, and in a big team
two people can share one (one of them is listed first and has the final say).

## 1. Teams and leads

| Team | Lead | Members | Owns | Main output |
| --- | --- | --- | --- | --- |
| **Game Team** | _name_ | _names_ | `teams/game/` | Game rules, learning structure, challenges, characters, progression |
| **Frontend Team** | _name_ | _names_ | `teams/frontend/`, `app/(frontend)/`, `public/dojo/` | The playable, responsive dojo and dashboards |
| **Backend Team** | _name_ | _names_ | `teams/backend/`, `app/api/dojo/` | APIs, AI agents, content generation, assessment, data |
| **All leads** | — | — | `teams/shared/`, `teams/*.md`, `.github/CODEOWNERS` | Contracts and the rules of collaboration |

**Ownership means:** the owner writes the code, reviews every PR that touches the folder, and decides when
there's a disagreement. Nobody else edits an owned folder. Ask the owner instead.

## 2. Who does what

### Game Team

| Slot | Person | Owns | Delivers |
| --- | --- | --- | --- |
| **G1 · Game lead / systems** | _name_ | `game/docs/GAME_DESIGN.md`, `game/balance/`, `game/battle/` | Core game loop, battle rules (HP, damage, combo, timer, skills), every balance number, final call on rules |
| **G2 · Progression + mastery** | _name_ | `game/progression/`, `game/mastery/` | XP curve, levels, stars, rewards, achievements, floor unlocking, start/end-game, mastery rule, adaptive difficulty |
| **G3 · Levels, challenges, boss** | _name_ | `game/boss/`, `game/content/floor-blueprints.ts`, `question-templates.ts`, `demo-dojo.ts` | Topic → floors → objectives, challenge mix per floor, question design, Final Boss phases + victory conditions, the demo dojo |
| **G4 · Characters + story** | _name_ | `game/characters/`, `game/content/story.ts`, `dialogue.ts`, `enemies.ts` | Sensei, Rival, Classmate, Boss personalities and dialogue style, story, enemies, battle lines |

### Frontend Team

| Slot | Person | Owns | Delivers |
| --- | --- | --- | --- |
| **F1 · Frontend lead / design system** | _name_ | `frontend/docs/STYLE_GUIDE.md`, `frontend/theme/`, `frontend/app-shell/`, `frontend/lib/`, `teams/DOJOLEARN.md` | Style guide, design tokens, layout + navigation, API client, i18n hook, responsive + accessibility rules, hiding unused DojoLearn screens |
| **F2 · Game UI** | _name_ | `features/battle/`, `features/boss/`, `features/progress/`, `public/dojo/` | Battle screen, arena, fighters, health / combo / skill bars, animations + sound, Final Boss screens, XP bar, achievement toasts, assets |
| **F3 · Learning UI** | _name_ | `features/dojo-map/`, `features/lesson/`, `features/challenges/`, `features/agents/`, `features/student-chat/` | Dojo map, lesson screen (DojoLearn slides + narration), whiteboard, coding / simulation / project screens, Sensei / Rival / Classmate chat, voice mode + subtitles, student chat |
| **F4 · Dashboards + teacher** | _name_ | `features/dashboards/`, `features/leaderboard/`, `features/teacher-tools/` | Student + teacher dashboards, bar / line / radar / progress charts, leaderboard, create-a-dojo screen |

### Backend Team

| Slot | Person | Owns | Delivers |
| --- | --- | --- | --- |
| **B1 · Backend lead / platform** | _name_ | `backend/api/`, `backend/auth/`, `backend/data/`, `backend/docs/API.md`, `app/api/dojo/` | All endpoints, student/teacher roles + teacher access, in-memory then Postgres storage, deployment, environment + AI provider config |
| **B2 · AI content generation** | _name_ | `backend/generation/`, `backend/ai/` | Dojo from a topic or uploaded PDF (via DojoLearn), floors, objectives, lessons, challenges, hints, boss questions |
| **B3 · Agents, chat, voice** | _name_ | `backend/agents/`, `backend/voice/`, `backend/social/chat.ts` | Sensei / Rival / Classmate / Boss agents (DojoLearn multi-agent), adaptive boss, real-time Q&A, web search, student chat, TTS + speech recognition |
| **B4 · Assessment + analytics** | _name_ | `backend/assessment/`, `backend/analytics/`, `backend/social/leaderboard.ts` | Grading (quiz, AI short answer, code, project/debate), personalized feedback, mastery tracking, difficulty adaptation, battle + boss assessment, dashboard data, leaderboard, export |

### Shared files

| File(s) | Owner | Rule |
| --- | --- | --- |
| `teams/shared/**` | the three leads together | small PRs, one reviewer per team, add fields rather than renaming them |
| `package.json`, `pnpm-lock.yaml` | B1 | ask B1 before adding a dependency, and B1 merges it |
| `eslint.config.mjs`, `vitest.config.ts` | B1 | |
| `.github/CODEOWNERS`, `teams/*.md` | the three leads | |
| Anything else (core platform code) | F1 decides for UI, B1 for server | don't edit without telling both |

## 3. Cross-team features: who does which part

**A** = decides (accountable), **R** = builds it, **C** = must be consulted.

| Feature | Game | Frontend | Backend |
| --- | --- | --- | --- |
| Battle (quiz fight) | **A** rules (G1) | **R** screen + animations (F2) | **R** questions + grading API (B4) |
| Final Boss | **A** phases (G3) | **R** boss screens (F2) | **R** adaptive boss + assessment (B3, B4) |
| Floors / dojo map | **A** level design (G3) | **R** map (F3) | **R** floor data + unlock state (B1) |
| Dojo generation from topic / PDF | **C** blueprints (G3) | **R** create screen (F4) | **A R** generator (B2) |
| AI characters | **A** personalities (G4) | **R** chat UI + avatars (F3) | **R** agent runtime (B3) |
| XP, rewards, achievements | **A** rules (G2) | **R** bars + toasts (F2) | **R** saving + awarding (B4) |
| Mastery + difficulty | **A** rules (G2) | **C** | **R** tracking + adaptation (B4) |
| Dashboards (student + teacher) | **C** what "mastery" means (G2) | **A R** charts + layout (F4) | **R** data (B4) |
| Leaderboard | **A** ranking rules (G2) | **R** UI (F4) | **R** data (B4) |
| Student chat | — | **R** UI (F3) | **A R** server (B3) |
| Voice mode | **C** character voices (G4) | **R** playback + subtitles (F3) | **A R** TTS / ASR (B3) |
| Teacher access | **A** what teachers see in the game (G1) | **R** teacher screens (F4) | **R** roles + permissions (B1) |
| Style guide, DojoLearn cleanup | **C** | **A R** (F1) | **C** |
| Contracts (`teams/shared`) | **A R** (G1) | **A R** (F1) | **A R** (B1) |

## 4. Handoffs: what each team owes the others

| Milestone | Game Team gives | Backend Team gives | Frontend Team gives |
| --- | --- | --- | --- |
| **M0 · kickoff (first 2 h)** | draft of `GAME_DESIGN.md` §1–3 | — | draft of `STYLE_GUIDE.md` §1–3 | 
| | **All three leads:** contracts in `teams/shared` agreed and merged | | |
| **M1 · mocks** | `demo-dojo.ts` filled, `balance.ts` first numbers, 4 character personas | in-memory store seeded with the demo dojo, `GET /dojos/[id]` live | pages render the demo dojo from mock data |
| **M2 · core loop** | battle reducer + mastery rule + tests | battle start / answer / finish endpoints, short-answer grading | playable battle against the real API |
| **M3 · AI + boss** | boss phases, question templates | generation from topic / PDF, agents, chat | boss screens, agent chat, dashboards on real data |
| **M4 · demo** | balance pass after playtests | Postgres, deployment | polish, mobile, languages, demo script |

## 5. Working agreements

1. **Stay in your folder.** Need a change elsewhere? Ask its owner (see the tables above) or open an issue.
2. **Branches:** `game/<topic>`, `frontend/<topic>`, `backend/<topic>`. Small PRs, rebased on `main` daily.
3. **Reviews:** a PR needs a review from the owner of every folder it touches. `teams/shared` changes need one
   reviewer per team.
4. **Disagreements:** the owner decides inside their folder. For cross-team questions, the **A** in the table above
   decides. Anything else goes to the three leads.
5. **Definition of done:** the stub's `TODO` is gone, `it.todo` became a real test, and `pnpm lint` + `pnpm test` pass.
6. **Daily sync (10 min):** each lead says what was delivered, what's blocked, and what they need from another team.

See also: [README.md](README.md) (folder map and conflict rules) · [ARCHITECTURE.md](ARCHITECTURE.md)
