# API — BACKEND TEAM

All stubs return `501`. Paths are also in `teams/shared/contracts/api-routes.ts`.

| Method | Path | Handler (`teams/backend/api/`) | Purpose |
| --- | --- | --- | --- |
| GET, POST | `/api/dojo/me` | `me.ts` | current user / switch demo user |
| GET, POST | `/api/dojo/dojos` | `dojos.ts` | list / create (topic or OpenMAIC course) |
| GET | `/api/dojo/dojos/[dojoId]` | `dojo-by-id.ts` | dojo + floor map |
| POST | `/api/dojo/dojos/[dojoId]/battles` | `battle-start.ts` | start floor / boss battle |
| POST | `/api/dojo/battles/[battleId]/answers` | `battle-answer.ts` | grade + mastery |
| POST | `/api/dojo/battles/[battleId]/finish` | `battle-finish.ts` | rewards |
| POST | `/api/dojo/agents` | `agents.ts` | Sensei / Rival / Classmate / Boss |
| GET, POST | `/api/dojo/chat/[roomId]` | `chat.ts` | student chat |
| GET | `/api/dojo/leaderboard/[dojoId]` | `leaderboard.ts` | leaderboard |
| GET | `/api/dojo/analytics/student` | `analytics-student.ts` | student dashboard |
| GET | `/api/dojo/analytics/teacher` | `analytics-teacher.ts` | teacher dashboard |
