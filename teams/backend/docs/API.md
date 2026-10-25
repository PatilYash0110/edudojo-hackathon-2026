# DojoLearn API — BACKEND TEAM

Types: `teams/shared/contracts/backend-api.ts`. Paths: `teams/shared/contracts/api-routes.ts`.
Auth: httpOnly cookie `dojo_session`, set by signup/login/join. Responses: `{ success: true, ...data }` or
`{ success: false, errorCode, error }` (`error` is German, show it to the user).

| Method | Path | Who | Body | Returns |
| --- | --- | --- | --- | --- |
| POST | `/api/dojo/auth/teacher/signup` | anyone | `TeacherSignupBody` | `{ user: Me }` |
| POST | `/api/dojo/auth/teacher/login` | anyone | `TeacherLoginBody` | `{ user: Me }` |
| POST | `/api/dojo/auth/join` | anyone | `StudentJoinBody` (PIN + nickname) | `{ user: Me }` |
| POST | `/api/dojo/auth/logout` | anyone | – | `{}` |
| GET | `/api/dojo/me` | anyone | – | `{ user: Me \| null }` |
| GET | `/api/dojo/classes` | teacher | – | `{ classes: ClassSummary[] }` |
| POST | `/api/dojo/classes` | teacher | `CreateClassBody` | `{ class: ClassSummary }` (has the PIN) |
| GET | `/api/dojo/classes/[classId]` | teacher | – | `{ class: ClassDetail }` (students + progress) |
| DELETE | `/api/dojo/classes/[classId]` | teacher | – | `{}` (erases its students' data) |
| POST | `/api/dojo/classes/[classId]/pin` | teacher | – | `{ class: ClassSummary }` (new PIN) |
| GET | `/api/dojo/classes/[classId]/leaderboard` | class members + teacher | – | `{ entries: LeaderboardEntry[] }` |
| GET | `/api/dojo/classrooms` | signed in | – | `{ classrooms: Classroom[] }` |
| POST | `/api/dojo/classrooms` | signed in | `CreateClassroomBody` | 202 `{ classroom }` (`generating`) |
| GET | `/api/dojo/classrooms/[id]` | creator, class | – | `{ classroom }`; poll every 5 s until `ready`/`failed` |
| GET | `/api/dojo/classrooms/[id]/chat` | creator, class | – | `{ messages: ChatMessage[] }` (own thread) |
| POST | `/api/dojo/classrooms/[id]/chat` | creator, class | `ChatBody` | `text/event-stream`, see `ChatStreamEvent` |
| POST | `/api/dojo/classrooms/[id]/quizzes` | student | `StartQuizBody` | 201 `{ quiz: Quiz }` (5 new questions) |
| POST | `/api/dojo/quizzes/[quizId]/answers` | student | `AnswerBody` | `{ result: AnswerResult }` |
| GET | `/api/dojo/analytics/student?classroomId=` | signed in | – | `{ dashboard: StudentDashboard }` |
| GET | `/api/dojo/analytics/teacher?classroomId=` | teacher (class classroom) | – | `{ dashboard: TeacherDashboard }` |

## Flows

- **Teacher:** signup → `POST /classes` (shows PIN) → `POST /classrooms { prompt, classId }` → poll → dashboards.
- **Student:** `POST /auth/join { pin, nickname }` → `GET /classrooms` → open `playerUrl` (slides + narration) →
  chat → quizzes → `GET /analytics/student`.
- **PDF:** upload with DojoLearn's `POST /api/materials` first, then pass `materialIds` to `POST /classrooms`.

## Daily limits

Students: 3 classrooms, 200 chat messages, 30 quizzes. Teachers: 20 classrooms. Over the limit: 429 `RATE_LIMITED`.
