# Deploy (CI/CD)

| Event | What runs |
| --- | --- |
| PR into `development` or `main` | `check` (tsc + eslint) and `test` (vitest), on two runners (`.github/workflows/ci.yml`) |
| Merge into `main` | `check` + `test`, then the Render deploy hook |

```
browser ─▶ Render dojolearn (Next.js: pages + API) ──▶ Supabase PROD (Postgres)
                          └──────────────────────────▶ Render dojolearn-tts (Speaches, German voice)
```

One service runs the whole app. The database schema migrates itself when the app boots, so there is no separate
migration step. Nothing deploys on a push: Render deploys only from the workflow, after `check` and `test` pass.

## One-time setup (about 10 min)

### 1. Supabase (PROD database)

Project → **Connect** → copy the **Session pooler** URI (port **5432**). Do not use the transaction pooler (6543): it
breaks the locks the migrations take. URL-encode special characters in the password.

### 2. Render

1. **New → Blueprint** → pick this repo and branch. Use `main` once this file is on `main`. Render reads `render.yaml`
   and creates `dojolearn` and `dojolearn-tts`.
2. Fill in the prompted values:
   - `DATABASE_URL`: the Supabase URI from step 1
   - `DEEPSEEK_API_KEY`: the DeepSeek key
   - `SPEACHES_BASE_URL`: `https://<dojolearn-tts URL>/v1` (the URL is on the TTS service page; it is usually
     `https://dojolearn-tts.onrender.com/v1`)
3. `dojolearn` → **Settings → Deploy Hook** → copy the URL.
4. If you created the Blueprint from a branch other than `main`, change `dojolearn` → **Settings → Branch** to `main`.

The site is the `dojolearn` URL (usually `https://dojolearn.onrender.com`). `dojolearn-tts` is not redeployed by CI,
because nothing in the repo changes it. To update Speaches, click **Manual Deploy** on that service.

### 3. GitHub secret

Repo → **Settings → Secrets and variables → Actions** → add `RENDER_DEPLOY_HOOK_URL` (the URL from step 2.3).

### 4. Local dev

`openmaic.dojo.yml` reads `apiKey: ${SPEACHES_API_KEY}`, because the deployed TTS requires a key. Add
`SPEACHES_API_KEY=local` to `.env.local`. Any value works locally, and the server refuses to boot while it is unset.

## Demo day

- Switch both Render services from `free` to `starter`. Free services sleep after 15 min idle (the first request takes
  about 1 min) and have 0.1 CPU.
- Upload files go to the Render disk, which is wiped on every deploy. Move them to Supabase Storage (S3 settings in
  `.env.example`) before real users upload anything.

## When something breaks

- **CI red**: open the failed job. `check` prints one log group per tool (tsc, eslint); `test` is plain vitest.
- **Merged, site not updated**: check Render → `dojolearn` → **Events**. The workflow does not wait for Render.
- **Site slow or 502**: Render is asleep or still building. Wait, or open `https://<site>/api/health`.
