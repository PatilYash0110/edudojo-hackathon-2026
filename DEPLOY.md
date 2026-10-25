# Deploy (CI/CD)

| Event | What runs |
| --- | --- |
| PR into `development` or `main` | `check` (tsc + eslint) and `test` (vitest), on two runners (`.github/workflows/ci.yml`) |
| Merge into `main` | `check` + `test` + `image` (Docker build, pushed to GHCR) in parallel, then Render deploys that image |

```
browser ─▶ Render dojolearn (Next.js: pages + API) ──▶ Supabase PROD (Postgres)
                          └──────────────────────────▶ Render dojolearn-tts (Speaches, German voice)
```

One service runs the whole app. GitHub Actions builds its Docker image, because Render's 8 GB builder runs out of
memory on this app, and Render only pulls and runs it. The database schema migrates itself when the app boots, so there
is no separate migration step. Nothing deploys on a push: Render deploys only from the workflow, after `check`, `test`
and `image` pass.

## One-time setup (about 15 min, plus one CI run)

### 1. Supabase (PROD database)

Project → **Connect** → copy the **Session pooler** URI (port **5432**). Do not use the transaction pooler (6543): it
breaks the locks the migrations take. URL-encode special characters in the password.

### 2. First image

Merge `development` into `main` once. The `image` job pushes `ghcr.io/patilyash0110/edudojo-hackathon-2026`. The
`deploy` job fails this first time, because Render is not set up yet. Then, on GitHub, open the repo's **Packages** →
`edudojo-hackathon-2026` → **Package settings** → **Change visibility** → **Public**, so Render can pull it.

### 3. Render

1. **New → Blueprint** → pick this repo, branch `main`. Render reads `render.yaml` and creates `dojolearn` (from the
   image) and `dojolearn-tts`. If an older `dojolearn` exists that builds from the Dockerfile, delete it first: Render
   cannot switch a service from Docker build to image.
2. Fill in the prompted values:
   - `DATABASE_URL`: the Supabase URI from step 1
   - `DEEPSEEK_API_KEY`: the DeepSeek key
   - `SPEACHES_BASE_URL`: `https://<dojolearn-tts URL>/v1` (the URL is on the TTS service page; it is usually
     `https://dojolearn-tts.onrender.com/v1`)
3. `dojolearn` → **Settings → Deploy Hook** → copy the URL.

The site is the `dojolearn` URL (usually `https://dojolearn.onrender.com`). `dojolearn-tts` is not redeployed by CI,
because nothing in the repo changes it. To update Speaches, click **Manual Deploy** on that service.

### 4. GitHub secret

Repo → **Settings → Secrets and variables → Actions** → add `RENDER_DEPLOY_HOOK_URL` (the URL from step 3.3). Then
re-run the failed workflow on `main` (**Actions** → the run → **Re-run failed jobs**), or merge again.

### 5. Local dev

`dojolearn.dojo.yml` reads `apiKey: ${SPEACHES_API_KEY}`, because the deployed TTS requires a key. Add
`SPEACHES_API_KEY=local` to `.env.local`. Any value works locally, and the server refuses to boot while it is unset.

## Demo day

- Switch both Render services from `free` to `starter`. Free services sleep after 15 min idle (the first request takes
  about 1 min) and have 0.1 CPU.
- Upload files go to the Render disk, which is wiped on every deploy. Move them to Supabase Storage (S3 settings in
  `.env.example`) before real users upload anything.

## When something breaks

- **CI red**: open the failed job. `check` prints one log group per tool (tsc, eslint); `test` is plain vitest.
- **Merged, site not updated**: check the `image` and `deploy` jobs in Actions, then Render → `dojolearn` →
  **Events**. The workflow does not wait for Render.
- **Render cannot pull the image**: the GHCR package is private. Make it public (step 2).
- **Site slow or 502**: Render is asleep or still building. Wait, or open `https://<site>/api/health`.
