# Who works where

**One team = one folder.** Stay inside your team's folder and you won't conflict with the other teams.

```
teams/
├── shared/      ALL TEAMS   contracts (types + API paths) — changes need 1 reviewer from each team
├── game/        GAME TEAM   rules, balance, characters, levels, questions, docs, tests
├── backend/     BACKEND     API handlers, AI generation, agents, grading, data, voice, tests
└── frontend/    FRONTEND    pages, components, theme, i18n, charts, docs
```

Next.js forces three things to live outside `teams/`. They're **one-line wiring files**: you add one when you add
a page or endpoint, and otherwise never edit them.

| Outside `teams/` | Team | What's in it |
| --- | --- | --- |
| `app/(frontend)/**/page.tsx`, `layout.tsx` | FRONTEND | `export { default } from '@/teams/frontend/...'` |
| `app/api/dojo/**/route.ts` | BACKEND | `export { GET, POST } from '@/teams/backend/api/...'` |
| `public/dojo/` | FRONTEND | images, sprites, audio |

Everything else in the repo is **core platform code** — read it, reuse it, don't edit it without telling everyone
(see [DOJOLEARN.md](DOJOLEARN.md)).

## Feature → team → folder

| Feature (from the brief) | Team | Folder |
| --- | --- | --- |
| Style guide, match the target design | FRONTEND | `teams/frontend/docs/STYLE_GUIDE.md`, `teams/frontend/theme/` |
| Filter out unused DojoLearn features | FRONTEND (decide together) | `teams/DOJOLEARN.md` |
| Learning mechanics, game loop, start/end game | GAME | `teams/game/battle/`, `teams/game/progression/` |
| Levels: every floor = a topic/section | GAME | `teams/game/content/floor-blueprints.ts` |
| XP, health, skills, rewards, achievements (rules) | GAME | `teams/game/progression/`, `teams/game/battle/skills.ts` |
| XP bar, health bar, achievement toast (UI) | FRONTEND | `teams/frontend/features/progress/`, `features/battle/` |
| Mastery rules, difficulty adaptation (rules) | GAME | `teams/game/mastery/` |
| Final Boss phases + victory conditions | GAME | `teams/game/boss/` |
| Characters: Sensei, Rival, Classmate, Boss (personalities, story) | GAME | `teams/game/characters/`, `teams/game/content/story.ts` |
| Question design | GAME | `teams/game/content/question-templates.ts` |
| Dojo map + floor selection | FRONTEND | `teams/frontend/features/dojo-map/` |
| Lesson screen (DojoLearn slides + voice narration), whiteboard | FRONTEND | `teams/frontend/features/lesson/` |
| Battle screen, arena, animations | FRONTEND | `teams/frontend/features/battle/` |
| Final Boss screens | FRONTEND | `teams/frontend/features/boss/` |
| Coding / simulation / project screens | FRONTEND | `teams/frontend/features/challenges/` |
| AI chatbot + voice mode UI | FRONTEND | `teams/frontend/features/agents/` |
| Chat for students (UI) | FRONTEND | `teams/frontend/features/student-chat/` |
| Leaderboard (UI) | FRONTEND | `teams/frontend/features/leaderboard/` |
| Student + teacher dashboards, bar/line/radar/progress charts | FRONTEND | `teams/frontend/features/dashboards/` |
| Create a dojo (teacher UI) | FRONTEND | `teams/frontend/features/teacher-tools/` |
| Backgrounds, sprites, audio | FRONTEND | `public/dojo/` |
| Responsive, multilingual, accessibility | FRONTEND | `teams/frontend/theme/`, `features/*/strings.ts` |
| Generate a dojo from a topic or uploaded PDF | BACKEND | `teams/backend/generation/` |
| Agent runtime, adaptive Boss, real-time Q&A, web search | BACKEND | `teams/backend/agents/` |
| AI grading + feedback, quiz battles, code, projects | BACKEND | `teams/backend/assessment/` |
| Mastery tracking + progress storage | BACKEND | `teams/backend/assessment/attempts.ts`, `teams/backend/data/` |
| Student chat + leaderboard (server) | BACKEND | `teams/backend/social/` |
| Dashboard data: strengths, weaknesses, topics to revisit | BACKEND | `teams/backend/analytics/` |
| Teacher access / roles / auth | BACKEND | `teams/backend/auth/` |
| Text-to-speech, speech recognition | BACKEND | `teams/backend/voice/` |
| APIs, database, deployment, export | BACKEND | `teams/backend/api/`, `teams/backend/data/`, `teams/backend/analytics/export.ts` |

The earlier "Team 1 / Team 2 / Team 3" list maps the same way. Team 1 (Dojo Game & UX) → FRONTEND + GAME rules,
Team 2 (AI Content & Agents) → BACKEND `generation/` + `agents/` + GAME `characters/`, Team 3 (Challenges, Assessment &
Backend) → BACKEND `assessment/` + `data/` + `api/`.

## Rules that keep conflicts low

1. **Never edit another team's folder.** Need something from them? Ask, or open an issue.
2. **Inside a team, each sub-folder has one owner.** Fill in the "Owner" column in your team's README.
3. **No `index.ts` barrel files.** Import the file directly (`@/teams/game/battle/battle-engine`). A barrel is a file
   everybody edits, which means conflicts.
4. **Add files, don't grow shared ones.** One component per file; strings live in each feature's own `strings.ts`.
5. **`teams/shared/` changes:** a small PR, one reviewer from each team, and add fields rather than renaming them.
6. **Owned hot files** (one person merges changes): `package.json` + `pnpm-lock.yaml`, `eslint.config.mjs`,
   `vitest.config.ts`, `.github/CODEOWNERS`.
7. **Branches:** `game/<topic>`, `frontend/<topic>`, `backend/<topic>`. Keep PRs small and rebase on `main` daily.
8. **Imports are checked by ESLint.** `game` imports only `shared`, `frontend` never imports `backend` (it uses HTTP),
   and `backend` never imports `frontend`.

```
teams/game ──▶ teams/shared ◀── teams/frontend ──HTTP /api/dojo──▶ teams/backend
     ▲                                                                │
     └───────────────── backend imports game rules ───────────────────┘
```

More: [OWNERSHIP.md](OWNERSHIP.md) (names, roles, handoffs) · [ARCHITECTURE.md](ARCHITECTURE.md) · [DOJOLEARN.md](DOJOLEARN.md) · [game](game/README.md) ·
[frontend](frontend/README.md) · [backend](backend/README.md) · [shared](shared/README.md)
