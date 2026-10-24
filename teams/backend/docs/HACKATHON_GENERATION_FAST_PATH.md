# Hackathon generation fast path

Status: proposed for Claude to implement. No production behavior has changed yet.

## Decision

Build a Dojo-only fast path. Keep normal OpenMAIC generation unchanged.

For live demo generation:

- Generate at most five scenes.
- Use this mix: three `slide` scenes, one `interactive` scene, one `quiz` scene.
- Use one preset teacher, no generated agent roster.
- Generate at most two speech segments per scene.
- Set `PARALLEL_SCENE_CONCURRENCY=3` after a local concurrency check.
- Keep image generation, video generation, and web research disabled.
- Keep PBL out of the live path. Show PBL from a seeded showcase classroom if judges need every supported scene type.

This keeps the live path representative without putting the slowest scene type on the critical path.

## Why this is needed

The latest measured classroom had eight generated scenes. The remaining 64 percent of its run took 17 minutes 32 seconds on `deepseek-flash`.

Measured costs:

- Scene content plus actions: 16 seconds to 2 minutes 52 seconds per scene.
- Interactive content was the slowest scene.
- TTS: about 8 seconds per narration line.
- Each scene had 8 to 18 narration lines.

TTS call count is the clearest bottleneck. Reducing eight scenes to five helps, but five verbose scenes can still require 40 to 90 TTS calls.

The code already has useful concurrency:

- `lib/server/generation/run/engine.ts` prewarms scene content when `PARALLEL_SCENE_CONCURRENCY` is greater than 1.
- The same setting also runs speech synthesis concurrently within each scene.
- The setting is currently absent from `.env.local`, so generation is serial.
- `.env.example` says TTS stays serial. That comment is stale and should be corrected.

## Scene profiles

### Recommended live profile

1. Hook or topic overview, `slide`
2. Core explanation, `slide`
3. Hands-on model or simulation, `interactive`
4. Knowledge check, `quiz`
5. Summary and next step, `slide`

This profile exercises all demo-critical renderers and avoids the PBL planner.

### Full type showcase

1. Topic overview, `slide`
2. Core explanation, `slide`
3. Hands-on model, `interactive`
4. Knowledge check, `quiz`
5. Applied challenge, `pbl`

Use this only for a classroom generated before the presentation. The current `SceneOutline` union has four types: `slide`, `quiz`, `interactive`, and `pbl`. PBL is a larger workflow, so requiring it during every live run conflicts with the short demo target.

## Approaches considered

### 1. Smaller output plus existing concurrency

Cap Dojo generation at five scenes, shorten narration, and enable concurrency already present in the runner.

Tradeoff: lowest implementation risk. It still depends on model and local TTS latency.

Verdict: implement first.

### 2. Browser-native speech for live demos

Skip server audio generation and let playback speak action text through browser speech synthesis.

Tradeoff: removes almost all TTS generation time, but voice quality and installed German voices vary by demo machine. Exported classrooms also lack generated audio assets.

Verdict: keep as an operator fallback. Test on the exact presentation laptop before using it.

### 3. Deferred or background TTS

Mark the classroom ready after content and actions, then synthesize narration after the course is playable.

Tradeoff: best perceived speed, but it changes run completion semantics, persistence, retries, and player readiness. Too much risk for the hackathon unless options 1 and 2 fail their timing budget.

Verdict: defer.

## Proposed implementation

### 1. Add a run-level scene limit

Add optional `maxScenes` to `GenerationRunInput`.

Rules:

- Accept integers from 1 through 20.
- Leave it undefined for existing callers.
- `teams/backend/generation/classroom.ts` passes `maxScenes: 5`.
- Tell the outline model about the limit so it spends tokens on only five scenes.
- After outline normalization, enforce the limit with `slice(0, maxScenes)` and renumber `order` from 1. The server cap is required because prompt instructions are not a guarantee.
- Do not change the global `MAX_OUTLINE_SCENES = 100`; that would alter non-Dojo behavior.

Likely files:

- `lib/server/generation/run/types.ts`
- `lib/server/generation/run/input.ts`
- `lib/server/generation/run/engine.ts`
- `teams/backend/generation/classroom.ts`
- `tests/server/generation-run/input.test.ts`
- `tests/server/generation-runs.pg.test.ts`

The Dojo requirement should ask for the recommended scene profile. The hard cap and the teaching request are separate concerns: the server enforces count, while the prompt guides scene types.

### 2. Reduce speech calls at the source

Change action prompts, not TTS storage or playback.

- `packages/@openmaic/generation/templates/slide-actions/system.md`: request 3 to 6 total action/text objects and at most 2 speech objects.
- `packages/@openmaic/generation/templates/interactive-actions/user.md`: request 3 to 6 total items and at most 2 speech objects.
- Quiz and PBL prompts already request 1 to 2 speech segments.
- Keep speech useful. Each segment may cover several related visual elements.

Do not merge audio files after generation. Speech actions are interleaved with spotlights and widget actions, so post-generation merging can break playback order.

Add prompt snapshot tests or focused assertions that fail if the two-speech limit disappears.

### 3. Enable existing bounded concurrency

Set this in the demo environment:

```dotenv
PARALLEL_SCENE_CONCURRENCY=3
```

This setting already controls scene-content prewarming and TTS concurrency within a scene. Start at 3 because both DeepSeek and the local Piper service may have practical concurrency limits.

Update the comment in `.env.example` to match actual behavior.

Do not raise `OPENMAIC_GENERATION_RUN_MAX_CONCURRENT`. That controls separate classroom runs, not the speed of one classroom.

### 4. Prepare the seeded fallback

Before judging:

- Generate one five-scene classroom with the full type showcase profile.
- Verify every scene renders and narration plays.
- Keep its `playerUrl` available.
- Keep one live prompt short and material-free.
- Warm the DeepSeek connection and Piper model before the presentation.

The fallback is a normal generated classroom, not a fake progress animation. Use it when venue network or provider latency makes a live run unsafe.

## Timing budget

Treat these as acceptance targets, not current measurements:

- Outline ready: at most 30 seconds.
- First persisted scene: at most 60 seconds.
- Five-scene classroom ready with Piper audio: at most 3 minutes.
- Browser-native fallback classroom ready: at most 90 seconds.

If the Piper path misses 3 minutes after speech reduction and concurrency, use browser-native speech for the live run and keep Piper audio in the seeded showcase.

## Measurement plan

Use this fixed German prompt and no uploaded material. Restart from the same warm state for each run.

> Erstelle eine kurze Unterrichtseinheit zur Photosynthese für eine 7. Klasse. Erkläre, was Pflanzen benötigen, wie Lichtenergie genutzt wird und warum der Prozess für Menschen wichtig ist.

Record:

- Total run time.
- Outline time.
- Per-scene content time.
- Per-scene action time.
- TTS clip count and total TTS time.
- Time to first appended scene.
- Scene types produced.

Run this sequence one change at a time:

1. Five-scene cap only, concurrency 0.
2. Add the two-speech prompt limit.
3. Set concurrency 2.
4. Set concurrency 3.
5. Test browser-native speech on the presentation laptop.

Keep a change only when the timing improvement exceeds normal run-to-run variation and the generated classroom still passes visual and playback checks.

## Acceptance checks

- Dojo classrooms never contain more than five generated scenes.
- Recommended live profile contains at least one `slide`, one `interactive`, and one `quiz`.
- Seeded showcase contains all four supported scene types, including `pbl`.
- Each generated scene has no more than two speech actions unless a provider length limit must split one action.
- Scene order remains contiguous after capping.
- Normal OpenMAIC generation behaves as before when `maxScenes` is absent.
- With concurrency 3, no provider 429 errors, TTS corruption, missing `audioId`, or scene-order changes occur.
- Existing generation tests, TypeScript, and lint pass.

Suggested checks:

```bash
pnpm test tests/server/generation-run/input.test.ts tests/server/provider-config.test.ts
pnpm test packages/@openmaic/generation/test/outline-prompt.test.ts packages/@openmaic/generation/test/scene-generation.test.ts
npx tsc --noEmit
pnpm lint
```

Run the PostgreSQL generation contract test when its test database is available.

## Out of scope

- Rewriting the generation runner.
- Adding a queue or cache layer.
- Parallelizing scene actions across scenes. They consume previous speech for continuity.
- Changing player auto-advance.
- Generating images or video during the live demo.
- Changing general OpenMAIC scene limits.

## Stop condition

Stop after the five-scene Piper run meets the 3-minute target twice on the presentation machine. If it does not, switch only the live demo to browser-native speech and keep the seeded Piper classroom for quality playback.
