# teams/backend — BACKEND TEAM

DojoLearn's server, built on OpenMAIC: Kahoot-style login, classes, AI-generated classrooms (slides + teacher
narration + quiz), chat with three AI agents, fresh quizzes with AI grading, mastery, leaderboard and dashboards.
Design decisions: [docs/DESIGN.md](docs/DESIGN.md). Endpoints: [docs/API.md](docs/API.md).
Types for callers: `teams/shared/contracts/backend-api.ts`.

## Setup

1. **Database (Supabase).** Project → Connect → copy the **direct** or **session pooler** URI (port **5432**). The
   transaction pooler (6543) breaks OpenMAIC's migration locks. Tables are created on first request.
2. **`.env.local`** (git-ignored, never commit keys):
   ```bash
   DATABASE_URL=postgresql://postgres.<ref>:<password>@<host>:5432/postgres
   DEEPSEEK_API_KEY=sk-...
   SPEACHES_BASE_URL=http://localhost:8000/v1   # in Docker: http://speaches:8000/v1
   OPENMAIC_SECRET_KEY=<openssl rand -base64 32>  # signs sessions; keep it stable
   ```
3. **Model config:** `cp teams/backend/config/openmaic.dojo.yml openmaic.yml`. Classroom generation uses
   `deepseek-v4-pro`; chat, guard, quizzes and grading use `deepseek-flash`; narration uses Piper.
4. **TTS (free, German):** Ollama has no TTS, so we run [Speaches](https://github.com/speaches-ai/speaches) (Piper
   voices, OpenAI-compatible API):
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dojo.yml up -d --build   # app + speaches
   curl -X POST http://localhost:8000/v1/models/speaches-ai/piper-de_DE-thorsten-high   # once
   ```
   For `pnpm dev`, run only Speaches: `docker compose -f docker-compose.dojo.yml up -d speaches`.
5. `pnpm install && pnpm dev`, then try `POST /api/dojo/auth/teacher/signup`.

## Folders

| Folder | What |
| --- | --- |
| `api/` | Route handlers (`app/api/dojo/**/route.ts` re-export them). `http.ts`: error envelope |
| `auth/` | Teacher passwords (scrypt), signed session cookie, current user |
| `data/db.ts` | Postgres pool + DojoLearn tables (OpenMAIC migration runner) |
| `guard/` | Keeps the LLM on task: prompt gate, on-topic chat check, daily limits |
| `ai/` | `askJson`: the one door to DeepSeek for our own calls |
| `generation/` | Start OpenMAIC classroom generation, then floors + learning objectives |
| `agents/` | The three chat agents and the chat bridge to OpenMAIC's director |
| `assessment/` | Fresh quiz questions and grading |
| `analytics/` | Dashboards, class progress, leaderboard |
| `config/` | `openmaic.dojo.yml` |
| `tests/` | Vitest: `pnpm test teams/backend` |

Not built yet (stubs): `agents/boss-brain.ts`, `assessment/grade-code.ts`, `assessment/grade-project.ts`,
`social/chat.ts` (student-to-student chat), `analytics/export.ts`.
