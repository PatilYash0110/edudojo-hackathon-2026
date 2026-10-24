# Deploy (CI/CD)

| Event | What runs |
| --- | --- |
| PR into `development` or `main` | `check`: tsc + eslint + vitest (`.github/workflows/ci.yml`) |
| Merge into `main` | `check`, then deploy: Render (API + TTS voice) and Vercel (pages) |

```
browser ─▶ Vercel (pages) ──/api/*──▶ Render dojolearn-api ──▶ Supabase PROD (Postgres)
                                              └──────────────▶ Render dojolearn-tts (Speaches, German voice)
```

The same Next.js app runs on both hosts. On Vercel, `BACKEND_URL` turns on a rewrite in `next.config.ts` that sends
every `/api/*` request to Render, so it stays same-origin. The database schema migrates itself when the app boots, so
there is no separate migration step. Nothing deploys on a push: Render and Vercel deploy only from the workflow, after
`check` passes.

## One-time setup (about 20 min)

### 1. Supabase (PROD database)

Project → **Connect** → copy the **Session pooler** URI (port **5432**). Do not use the transaction pooler (6543): it
breaks the locks the migrations take. URL-encode special characters in the password.

### 2. Render (API + TTS)

1. **New → Blueprint** → pick this repo, branch `main`. Render reads `render.yaml` and creates `dojolearn-api` and
   `dojolearn-tts`.
2. Fill in the prompted values:
   - `DATABASE_URL`: the Supabase URI from step 1
   - `DEEPSEEK_API_KEY`: the DeepSeek key
   - `SPEACHES_BASE_URL`: `https://<dojolearn-tts URL>/v1` (the URL is on the TTS service page; it is usually
     `https://dojolearn-tts.onrender.com/v1`)
3. `dojolearn-api` → **Settings → Deploy Hook** → copy the URL. This is the `RENDER_DEPLOY_HOOK_URL` secret.
4. Copy the `dojolearn-api` URL (for example `https://dojolearn-api.onrender.com`). This is `BACKEND_URL` for Vercel.

`dojolearn-tts` is not redeployed by CI because nothing in the repo changes it. To update Speaches, click
**Manual Deploy** on that service.

### 3. Vercel (pages)

1. **Add New → Project** → import this repo. Keep the defaults (Next.js, pnpm). `vercel.json` turns Git deploys off,
   so the first deploy comes from CI.
2. **Settings → Environment Variables** (Production):
   - `BACKEND_URL`: the Render API URL from step 2.4, with no trailing slash. It is needed at build time.
   - `DATABASE_URL`: the same Supabase URI. The app refuses to boot without it, even though API calls go to Render.
3. **Account Settings → Tokens** → create one. This is `VERCEL_TOKEN`.
4. **Project Settings → General** → copy **Project ID** (`VERCEL_PROJECT_ID`). Under **Team Settings → General**, copy
   **Team ID** (`VERCEL_ORG_ID`; on a personal account, use the user ID under **Account Settings**).

### 4. GitHub secrets

Repo → **Settings → Secrets and variables → Actions** → add `RENDER_DEPLOY_HOOK_URL`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`,
`VERCEL_PROJECT_ID`.

### 5. Backend config (one line, backend team)

The TTS service is public and requires `API_KEY`. Render passes the key to the API as `SPEACHES_API_KEY`. In
`teams/backend/config/openmaic.dojo.yml`, change `apiKey: not-needed` to `apiKey: ${SPEACHES_API_KEY}`. Without this
change, narration returns 401.

## Demo day

- Switch both Render services from `free` to `starter`. Free services sleep after 15 min idle (the first request takes
  about 1 min) and have 0.1 CPU.
- Upload files go to the Render disk, which is wiped on every deploy. Move them to Supabase Storage (S3 settings in
  `.env.example`) before real users upload anything.

## When something breaks

- **CI red**: open the `check` job; each tool (tsc, eslint, vitest) prints its own log group.
- **Merged, site not updated**: check Render → `dojolearn-api` → **Events** (the workflow does not wait for Render),
  and Vercel → **Deployments**.
- **API 502 on Vercel**: Render is asleep or still building. Wait, or check `https://<api>/api/health`.
