# DojoLearn

DojoLearn extends [OpenMAIC](https://github.com/THU-MAIC/OpenMAIC) with a game-based student journey, multi-agent tutoring, assessments, and teacher/student mastery dashboards.

## Team ownership

| Team | Owns | Primary paths |
| --- | --- | --- |
| Team 1 — Dojo Game & UX | Student game, design system, progression UI, accessibility | `features/dojo/`, `app/(experience)/` |
| Team 2 — AI Content & Agents | Course-to-dojo generation, Sensei/Rival/Classmate contracts, speech | `features/ai-learning/` |
| Team 3 — Assessment & Platform | Challenges, grading, mastery analytics, persistence and APIs | `features/assessment/`, `app/api/dojo/` |

Shared cross-team types live in `features/contracts/`. Teams may import from that folder; they must not import another team's internals.

## Local development

Requirements: Node.js 22.19+, pnpm 10+, Docker, and PostgreSQL 16.

```bash
pnpm install
cp .env.example .env.local
cp openmaic.example.yml openmaic.yml
pnpm db:up
pnpm dev
```

Open <http://localhost:3000/dojo> for the student experience or <http://localhost:3000/dashboard> for learning analytics.

## Team docs

- [Architecture and ownership](docs/architecture.md)
- [Team workstreams](docs/teams/README.md)
- [Style guide](design-system/dojolearn/MASTER.md)
- [OpenMAIC upstream changelog](CHANGELOG.md)

## License and attribution

This repository keeps OpenMAIC's MIT license. See [LICENSE](LICENSE) and the [upstream project](https://github.com/THU-MAIC/OpenMAIC).
