# Deploy — free, ~20 minutes

Stack: **Vercel** (frontend) + **Render** (backend) + **Neon** (Postgres).
All three have permanent free tiers, no credit card.

> **Demo caveat — read this first.** Render free web services sleep after
> 15 min idle and take ~30 s to wake. For a live demo, hit the URL once
> a minute before judging. Render free disks are also ephemeral, so any
> uploaded compliance/content PDFs disappear on redeploy. The demo seed
> recreates Menara Demo + Shah Alam on every boot via `SEED_ON_STARTUP=true`.

## 0. Push to GitHub

Both Render and Vercel deploy from a Git repo. Push this repo to GitHub
(public or private — both work on free tiers).

## 1. Database — Neon

1. Go to <https://neon.tech>, sign up, create a project (any name).
2. From the project dashboard, copy the **connection string**. It looks
   like `postgresql://user:pass@ep-xxxx.aws.neon.tech/neondb?sslmode=require`.
3. Keep that tab open — you'll paste this URL into Render in step 2.

## 2. Backend — Render

1. Go to <https://render.com>, sign up, click **New → Blueprint**.
2. Connect your GitHub repo. Render reads `render.yaml` automatically and
   proposes one web service: `opus-magnum-backend`.
3. Click **Apply**. The first build takes ~3 min.
4. Open the service settings → **Environment** and fill in the three
   `sync: false` vars:

   | Key | Value |
   |---|---|
   | `GLM_API_KEY` | from your local `.env` |
   | `DATABASE_URL` | the Neon connection string from step 1 |
   | `CORS_ORIGINS` | leave blank for now — fill in after step 3 |

   `SEED_ON_STARTUP` is already set to `true` so the DB self-seeds on
   first boot.

5. Click **Manual Deploy → Deploy latest commit**. When it goes green,
   visit `https://<your-service>.onrender.com/health` — it should return
   `{"ok": true, "model": "ilmu-glm-5.1"}`.
6. Copy the service URL (e.g. `https://opus-magnum-backend.onrender.com`)
   for step 3.

## 3. Frontend — Vercel

1. Go to <https://vercel.com>, sign up, click **Add New → Project**.
2. Import the same GitHub repo. Vercel will detect Next.js automatically.
3. **Important**: set the **Root Directory** to `frontend`.
4. Under **Environment Variables**, add:

   | Key | Value |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | the Render URL from step 2.6 |

5. Click **Deploy**. First build takes ~2 min.
6. Copy the Vercel URL (e.g. `https://opus-magnum.vercel.app`).

## 4. Close the CORS loop

Back in Render → Environment, set `CORS_ORIGINS` to your Vercel URL:

```
CORS_ORIGINS=https://opus-magnum.vercel.app
```

(All `*.vercel.app` preview URLs are also accepted via regex, so this
mainly matters if you wire up a custom domain later.)

Trigger a redeploy on Render. Done.

## Verify end-to-end

1. Open the Vercel URL.
2. The buildings page should list **Menara Demo** (seeded on boot).
3. Open `/admin` — Shah Alam template should be visible.
4. Open `/onboard` for Menara Demo and start a run. The graph should
   stream and GLM calls should land.

## After the demo

- Turn `SEED_ON_STARTUP` off after the first successful boot if you
  start authoring real data — it's idempotent but logs noise on every
  cold start.
- If you ever need persistent uploads, attach a Render disk (paid) or
  swap `STORAGE_BACKEND=local` for an S3/R2 backend (out of scope for
  the hackathon submission).
