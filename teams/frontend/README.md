# teams/frontend — FRONTEND TEAM

Everything the player sees. Talks to the backend over HTTP only (`lib/api-client.ts`), never imports `teams/backend`.
Each feature folder holds its page, components and `strings.ts`, so two people rarely touch the same file.

| Sub-folder | What | Owner |
| --- | --- | --- |
| `docs/STYLE_GUIDE.md` | style guide (fill first) | _name_ |
| `theme/` | design tokens (`dojo.css`, `tokens.ts`) | _name_ |
| `app-shell/` | layout, navigation, `Placeholder` (delete when unused) | _name_ |
| `lib/` | API client, i18n hook | _name_ |
| `features/dojo-map/` | dojo list, tower map, floor cards | _name_ |
| `features/lesson/` | lesson panel (DojoLearn slides + narration), whiteboard | _name_ |
| `features/battle/` | battle screen, arena, fighters, bars, question panel, result | _name_ |
| `features/boss/` | Final Boss screens | _name_ |
| `features/challenges/` | coding, simulation, project mission | _name_ |
| `features/agents/` | Sensei / Rival / Classmate chat, avatars, voice mode | _name_ |
| `features/student-chat/` | student chat | _name_ |
| `features/progress/` | XP bar, achievement toast | _name_ |
| `features/leaderboard/` | leaderboard | _name_ |
| `features/dashboards/` | student + teacher dashboards, charts | _name_ |
| `features/teacher-tools/` | create a dojo | _name_ |
| `../../public/dojo/` | assets | _name_ |

Add a page by creating `features/<feature>/<Name>Page.tsx` plus the one-line `app/(frontend)/<route>/page.tsx`.
