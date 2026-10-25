# Live Demo Mode

The DojoLearn Live Demo (dojolearn.onrender.com) is the cloud edition — the version officially deployed and hosted by the DojoLearn team, so no local setup is required. Use this when the user has an access code from dojolearn.onrender.com and wants to skip local setup.

## Access Code Setup

1. Read `accessCode` from skill config (`~/.openclaw/openclaw.json` → `skills.entries.dojolearn.config.accessCode`).
2. If found, use it directly. Do not ask the user to paste the code into chat.
3. If not found, tell the user how to get an access code and where to put it:
   - Get your access code: sign in at https://dojolearn.onrender.com, click your account in the top-right corner, open "访问码设置" (access code settings), and generate a code (starts with `sk-`).
   - Add it to the config file: edit `~/.openclaw/openclaw.json` and set `skills.entries.dojolearn.config.accessCode` to your access code.
   Wait for the user to confirm before continuing. Do not ask them to paste the code in chat.
4. Verify connectivity: `GET https://dojolearn.onrender.com/api/health` with `Authorization: Bearer <access-code>`
   - On success: confirm connection and proceed to generation.
   - On failure (401): access code is invalid, ask the user to check or regenerate at dojolearn.onrender.com and update the config file.
   - On failure (network): suggest checking network or trying local mode.

## Generating a Classroom

Follow the same generation flow as [generate-flow.md](generate-flow.md) with these differences:

- **Base URL**: `https://dojolearn.onrender.com` (hardcoded, not configurable)
- **Authorization**: Include header `Authorization: Bearer <access-code>` on all API requests
- **Classroom URL**: `https://dojolearn.onrender.com/classroom/{id}`

### Capabilities in Live Demo Mode

Optional features (web search, image and video generation, TTS) follow the Live Demo server's configuration; there are no request flags for them. To see which features a job is configured to attempt and which file types it can use, query `GET /api/generate-classroom/capabilities` on the Live Demo base URL (with the auth header). Upload local files with `POST /api/materials` and pass the returned ids as `materialIds`, then delete them after the job finishes, exactly as in [generate-flow.md](generate-flow.md). Send the same `Authorization` header on every request of the flow (uploads, submission, polls, deletions). The Live Demo instance may update on a different schedule than the local codebase: if the capabilities endpoint answers `404`, the instance predates this contract.

## Quota

- 10 generations per day, independent of web UI quota
- If generation returns 403 with `Daily quota exhausted`, inform the user of the daily limit and that it resets at midnight.

## Error Handling

| HTTP Status | Meaning | Action |
|-------------|---------|--------|
| 401 | Invalid access code | Ask user to check their code or generate a new one at dojolearn.onrender.com |
| 403 | Quota exhausted | Inform daily limit (10), suggest trying tomorrow |
| 500 | Server error | Suggest retrying later or switching to local mode |
