# Architecture and tech stack

DojoLearn is built inside the OpenMAIC Next.js app, so it reuses OpenMAIC's PDF upload, course generation, slides with
voice narration, quizzes, simulations, PBL, multi-agent classroom, TTS/ASR, i18n and database.

| Layer | Choice |
| --- | --- |
| App | Next.js 16 App Router, React 19, TypeScript (OpenMAIC's stack, one deploy) |
| UI | Tailwind CSS v4 + OpenMAIC's shadcn kit (`components/ui`), `motion` for battle animations |
| Charts | Recharts (`pnpm add recharts`) or hand-rolled SVG — Frontend decides on day 1 |
| Client state | Zustand (already installed) |
| Contracts | TypeScript types in `teams/shared/contracts` → zod 4 schemas |
| AI | OpenMAIC `callLLM` / `streamLLM` (`lib/ai/llm.ts`), any provider in `openmaic.yml` |
| Data | In-memory store first, then PostgreSQL via `pg` + OpenMAIC migrations |
| Voice | OpenMAIC TTS/ASR (`lib/audio`, `/api/generate/tts`, `/api/transcription`) + browser Web Speech |
| Tests | Vitest (`teams/**/*.test.ts`), Playwright (`e2e/`) |

## Routes

| URL | Page file (FRONTEND) |
| --- | --- |
| `/dojo` | `teams/frontend/features/dojo-map/DojoListPage.tsx` |
| `/dojo/[dojoId]` | `teams/frontend/features/dojo-map/DojoMapPage.tsx` |
| `/dojo/[dojoId]/floor/[floorId]` | `teams/frontend/features/lesson/FloorLessonPage.tsx` |
| `/dojo/[dojoId]/floor/[floorId]/battle` | `teams/frontend/features/battle/BattlePage.tsx` |
| `/dojo/[dojoId]/boss` | `teams/frontend/features/boss/BossPage.tsx` |
| `/dojo/[dojoId]/leaderboard` | `teams/frontend/features/leaderboard/LeaderboardPage.tsx` |
| `/dashboard` | `teams/frontend/features/dashboards/StudentDashboardPage.tsx` |
| `/teacher` | `teams/frontend/features/dashboards/TeacherDashboardPage.tsx` |
| `/teacher/dojo/new` | `teams/frontend/features/teacher-tools/CreateDojoPage.tsx` |

Endpoints (BACKEND, all return 501 for now): see [backend/docs/API.md](backend/docs/API.md).

## Flow (target)

1. A teacher uploads a PDF in OpenMAIC (existing flow), which generates a course.
2. `/teacher/dojo/new` calls `POST /api/dojo/dojos`, and `generation/from-document.ts` turns the course into floors.
3. A student plays: map, then lesson (`/classroom/[stageId]`), then battle. Answers are graded server-side, the arena
   animates with the Game Team's reducer, and rewards and mastery are saved.
4. Dashboards read `/api/dojo/analytics/*`.
