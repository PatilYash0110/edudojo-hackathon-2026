Generate an Ultra Mode course outline based on the following requirements.

---

## User Requirements

{{requirement}}

---

{{userProfile}}

## Language Context

Infer the course language directive by applying the decision rules from the system prompt. Key reminders:
- Requirement language = teaching language (unless overridden by explicit request or learner context)
- Foreign language learning → teach in user's native language, not the target language
- PDF language does NOT override teaching language — translate/explain document content instead

---

## Reference Materials

### PDF Content Summary

{{pdfContent}}

### Available Images

{{availableImages}}

### Web Search Results

{{researchContext}}

{{teacherContext}}

---

## Distribution Target

- **70% interactive scenes** (widgets: simulation, diagram, code, game)
- **30% slide scenes** (introductions, summaries, transitions)

## Widget Type Constraints (MANDATORY)

| Widget Type | Constraint |
|------------|-----------|
| simulation | **Minimum 2 scenes** |
| game | **Minimum 1 scene** |
| diagram | **Maximum 1 scene** |

## CRITICAL: Required Fields for Interactive Scenes

Every interactive scene MUST include:
- `widgetType`: One of "simulation", "diagram", "code", or "game"
- `widgetOutline`: Object with widget-specific configuration

Interactive scenes without these fields are INVALID.

## Widget Selection Guide

Choose widgets based on the content:

| Content Type | Recommended Widget |
|--------------|-------------------|
| Physics/Chemistry/Biology processes | simulation |
| Systems, processes, hierarchies | diagram |
| Programming, algorithms | code |
| Practice, challenge, application | game (action preferred) |

## Widget Design Principles (IMPORTANT)

### Simulation Widget
- Mobile-friendly: Controls MUST NOT overlap canvas
- Reset button MUST work correctly
- Touch-friendly controls (44px min)

### Diagram Widget
- First node VISIBLE on load (no blank screen)
- HIGH CONTRAST colors
- Add ICONS to nodes
- Color-code node types

### Minimum composition (REQUIRED)
- At least 2 `slide` scenes
- At least 1 `interactive` scene
- Exactly 1 `quiz` scene, placed LAST

### Quiz Scene (REQUIRED - exactly one)
- Exactly ONE scene with `type: "quiz"`, as the last scene of the course
- `quizConfig` is required on it; use at least 6 questions (prefer 6-10)
- Spread the questions over the distinct topics the course covered, at least 2 per topic
- This requirement is separate from the game-widget rule below

### Game Widget (CRITICAL - NO BORING QUIZZES!)
- **PREFER action/puzzle games over quizzes** (this is about `game` widgets, not the required `quiz` scene)
- Player MUST control something (not just click answers)
- If using simulation, make it INTERACTIVE gameplay
- Example GOOD game: "Control thrust to land safely"
- Example BAD game: "Click the correct answer"
- `gameType` should be "action", "puzzle", or "strategy", NOT just "quiz"

### Example: Good vs Bad Game Outline

❌ **BAD (boring quiz):**
```json
{
  "widgetType": "game",
  "widgetOutline": {
    "gameType": "quiz",
    "questionCount": 5
  }
}
```

✅ **GOOD (interactive game):**
```json
{
  "widgetType": "game",
  "widgetOutline": {
    "gameType": "action",
    "challenge": "控制推力使飞船安全着陆",
    "playerControls": ["thrust_slider"]
  }
}
```

**Final reminder**: your entire response must be a JSON **object** with exactly three top-level keys — `languageDirective` (string, inferred via the Language Inference rules in the system prompt), `courseTitle` (string, ≤30 chars, in the teaching language), and `outlines` (array of scene objects). Do not return a bare array. Do not wrap in prose or code fences.
