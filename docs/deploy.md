# Deploy — free, one platform, ~15 minutes

Everything runs on **Render**: backend, frontend, and Postgres. One signup,
one dashboard. The free Postgres lasts 90 days (we only need it for the
demo + judging window).

> **Demo caveat.** Render free web services sleep after 15 min idle and
> wake in ~30 s. Hit both URLs once a minute before judging. Free disks
> are ephemeral — uploaded PDFs vanish on redeploy. The demo seed
> recreates Shah Alam + Menara Demo on every boot via `SEED_ON_STARTUP=true`.

## Prereqs

- Repo pushed to GitHub (already true: `avinmaster/um-hackathon`).
- A Render account. Sign up at <https://render.com> with **GitHub** —
  fastest because Render needs to read your repo anyway.

## Steps

### 1. Apply the Blueprint

1. Go to <https://dashboard.render.com> → **New** → **Blueprint**.
2. Connect the `um-hackathon` repo. Render reads `render.yaml` and proposes:
   - `opus-magnum-db` — free Postgres
   - `opus-magnum-backend` — Python web service
   - `opus-magnum-frontend` — Node web service
3. Click **Apply**.

The DB provisions immediately. Both services start building. The backend
takes ~3 min, the frontend ~4 min (next build is heavy).

### 2. Fill in the two `sync: false` secrets

When prompted (or in **Backend → Environment** afterwards), paste:

| Key | Value |
|---|---|
| `GLM_API_KEY` | from your local `.env` |
| `CORS_ORIGINS` | leave blank for now — fill in step 3 |

`DATABASE_URL` is wired automatically from the Postgres instance.
`SEED_ON_STARTUP` is already `true`, so the DB self-seeds on boot.

### 3. Wire frontend → backend

When the backend finishes building, copy its public URL
(e.g. `https://opus-magnum-backend.onrender.com`).

Then, in **Frontend → Environment**, set:

| Key | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | the backend URL |

And, in **Backend → Environment**, set:

| Key | Value |
|---|---|
| `CORS_ORIGINS` | the frontend URL, e.g. `https://opus-magnum-frontend.onrender.com` |

Trigger a manual redeploy on the frontend so it picks up the env var.

### 4. Verify

- Backend: `https://<backend>.onrender.com/health` → `{"ok": true, ...}`
- Frontend: `https://<frontend>.onrender.com` → buildings page lists
  **Menara Demo** (seeded on boot).
- `/admin` shows the Shah Alam template; starting a run on Menara Demo
  streams the graph and lands GLM calls.

## After it's live

- Turn `SEED_ON_STARTUP` off after the first successful boot if you start
  authoring real data — the seed is idempotent but logs noise on every
  cold start.
- For persistent uploads, attach a Render disk (paid) or wire an S3/R2
  backend. Out of scope for the hackathon submission.
