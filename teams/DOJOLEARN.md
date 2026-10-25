# DojoLearn: keep / hide / restyle (decide together, FRONTEND applies)

| DojoLearn surface | Where | Decision |
| --- | --- | --- |
| Home, PDF upload, course generation | `app/page.tsx`, `/api/parse-pdf`, `/api/generate-classroom` | TODO |
| Classroom player (slides, narration, whiteboard) | `app/classroom/[id]`, `components/stage`, `components/whiteboard` | TODO |
| Quiz scenes | `lib/quiz`, `components/scene-renderers` | TODO |
| Interactive simulations | `lib/interactive` | TODO |
| Project-based learning | `lib/pbl` | TODO |
| Multi-agent roundtable | `components/roundtable`, `lib/orchestration` | TODO |
| Workbench, workspace, eval, generation preview | `app/workbench`, `app/workspace`, `app/eval`, `app/generation-preview` | TODO (likely hide) |
| Video export | `lib/video-export` | TODO |
| Settings / model config | `components/settings` | TODO |

Our code stays in `teams/` + the wiring files, so merges stay small.
