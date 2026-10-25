# DojoLearn

DojoLearn is an AI classroom platform with a Street-Fighter-style learning dojo (every
floor is a topic), AI characters (Sensei, Rival, Classmate, Boss), assessments, and teacher/student dashboards.

> **Status: skeleton.** Folders, placeholder pages, stub functions and 501 endpoints only. Nothing is implemented yet.

## Which team works where

| Team | Folder |
| --- | --- |
| **Game Team** | `teams/game/` |
| **Frontend Team** | `teams/frontend/` (+ one-line wiring in `app/(frontend)/`, assets in `public/dojo/`) |
| **Backend Team** | `teams/backend/` (+ one-line wiring in `app/api/dojo/`) |
| All teams | `teams/shared/` (contracts) |

Who does what (names, roles, handoffs): **[teams/OWNERSHIP.md](teams/OWNERSHIP.md)**.
Feature → team → folder map and conflict rules: [teams/README.md](teams/README.md).
Tech stack: [teams/ARCHITECTURE.md](teams/ARCHITECTURE.md).

## Run it

Requirements: Node.js 22.19+, pnpm 10+.

```bash
pnpm install
cp .env.example .env.local
cp openmaic.example.yml openmaic.yml
pnpm dev
```

Open <http://localhost:3000/dojo> for the placeholder pages and <http://localhost:3000> for the classroom platform.
Find open work with `grep -rn TODO teams`.

## License

This project is MIT licensed. See [LICENSE](LICENSE).
