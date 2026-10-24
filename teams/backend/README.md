# teams/backend — BACKEND TEAM

AI, data, assessment, server logic. All endpoints answer **501** until implemented. Never imports `teams/frontend`.

| Sub-folder | What | Owner |
| --- | --- | --- |
| `api/` | one handler file per endpoint (`app/api/dojo/**/route.ts` only re-exports these) | _name_ |
| `auth/` | student vs teacher, teacher access | _name_ |
| `data/` | repository interface, in-memory + PostgreSQL stores | _name_ |
| `generation/` | dojo from a topic / from an uploaded PDF (OpenMAIC course) | _name_ |
| `agents/` | Sensei / Rival / Classmate / Boss runtime, adaptive boss | _name_ |
| `assessment/` | grading (choice, AI short answer, code, project), attempts + mastery, battles | _name_ |
| `social/` | student chat, leaderboard | _name_ |
| `analytics/` | dashboard data, export | _name_ |
| `ai/llm.ts` | the only door to models (`callLLM` / `streamLLM`) | _name_ |
| `voice/` | TTS + speech recognition | _name_ |
| `docs/API.md` | endpoint list | _name_ |
| `tests/` | `it.todo` lists | everyone |

Add an endpoint by creating `teams/backend/api/<name>.ts` plus the one-line `app/api/dojo/<path>/route.ts`. Next.js
reads `export const runtime = ...` statically, so write that line directly in the `route.ts` file.

OpenMAIC to reuse: `lib/ai/llm.ts`, `lib/server/resolve-model.ts`, `app/api/quiz-grade/route.ts`, `lib/orchestration/`,
`lib/server/identity/with-owner.ts`, `lib/persistence/server-provider.ts`, `lib/audio/`, `lib/web-search/`.
