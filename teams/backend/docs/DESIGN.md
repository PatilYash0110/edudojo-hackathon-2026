# Backend design — decisions

Agreed in the backend design review (Oct 24). Change a row here when a decision changes.

| Area | Decision |
| --- | --- |
| Base | Reuse DojoLearn's engine. Our code lives in `teams/backend` + one-line routes in `app/api/dojo` |
| LLM | DeepSeek through DojoLearn's built-in provider. Key only in `.env.local`, users cannot add keys. `deepseek-v4-pro` generates classrooms; `deepseek-flash` does chat, guard, floors, questions, grading |
| Classroom | DojoLearn generation run from a prompt or PDF: slides, narration script, quiz scenes. Then one flash call groups scenes into floors with 2–4 learning objectives each (fixed chunks if that fails) |
| Voice | Slide narration only, generated with the classroom by DojoLearn's TTS slot → Speaches (Piper `de_DE-thorsten-medium`), free and open source. No voice in chat |
| Chat | DojoLearn's multi-agent director (`/api/chat/pi`) with three agents: teacher, curious classmate, correcting classmate. Random German names, role label always shown, ≤ 3 agent turns per message. History saved per student per classroom; agents see the last 20 messages |
| Harness | (1) gate on the creation prompt: allow learning topics, rewrite homework ghost-writing, reject harm and non-learning; only the cleaned goal reaches generation. (2) Scoped agent prompts. (3) Chat must be about the current classroom: keyword fast path, else a flash check; off-topic gets a fixed German redirect. (4) Model JSON validated with zod, 2 retries. (5) Daily limits |
| Login | Kahoot-style. Teachers: email + password (Node scrypt), signed httpOnly cookie. Students: 6-digit PIN + nickname, unique per class, cookie on that device. Self-paced |
| Classes | Teacher has many classes: create (PIN), list students + progress, new PIN, delete (cascades all student data) |
| Visibility | Teacher classrooms are shared with the class and published in DojoLearn so students can open the player by link. Student classrooms are private |
| Quiz | 5 fresh questions per start (≈3 multiple choice + 2 short answer), weakest objectives first, difficulty from mastery, avoids the student's last 30 questions. Answer keys stay server-side. Short answers graded by flash with German feedback; pass at score ≥ 0.6 |
| Progress | Mastery per objective, XP, level: first-version rules in `teams/game` (Game Team tunes). Leaderboard per class by XP |
| Dashboards | Student: mastery per objective, daily accuracy, strengths, weaknesses, lectures to revisit. Teacher: averages, objective struggle counts, per-student rows, hardest questions, topics to revisit |
| Data | Supabase Postgres (session/direct connection). Students store only a nickname. Files: local disk now, Supabase Storage (S3 settings) when deployed |
| Deploy | Docker (app + Speaches) now; Render/Vercel decided at the merge to `main` |

## Known limits (shortcuts)

- Login/join attempt limits are in memory, per process.
- A paused generation run shows as `failed`; DojoLearn's `POST /api/generation-runs/<runId>/retry` could resume it.
- Published classrooms are readable by anyone with the link (ids are unguessable).
- A student who loses the cookie starts as a new student.
