# cPanel Node.js Deployment Guide — Tamrakar Complex

## Prerequisites

- Node.js 20+ enabled on your cPanel host
- SSH access or File Manager access
- cPanel Node.js Application manager available

---

## Step 1 — Set Real Supabase Credentials BEFORE Building

VITE_* environment variables are **baked into the JS bundle at build time**.  
cPanel environment variables set at runtime have NO effect on these values.

Edit `.env.production` (do this locally, never commit real keys):

```env
VITE_SUPABASE_URL=https://tvgmnjuexdgtgtqhrjok.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your-real-anon-key>
VITE_ESEWA_ENABLED=false
VITE_ESEWA_MERCHANT_ID=EPAYTEST
VITE_REQUIRE_SUBSCRIPTION=true
```

---

## Step 2 — Build Locally

```bash
npm install
npm run build
```

Build output goes to `dist/`. Confirm zero errors. Expected bundle sizes:
- Main entry: ~540 KB (138 KB gzipped)
- Vendor chunks: react, query, supabase, ui, form, charts, utils

---

## Step 3 — Upload Files to cPanel

Upload these items to your application root (`tamrakar-main/` on the server):

| Item | Include |
|---|---|
| `dist/` | YES — entire folder |
| `server.cjs` | YES |
| `package.json` | YES |
| `package-lock.json` | YES |
| `node_modules/` | NO — install on server via cPanel |
| `src/` | NO — compiled already |
| `.env` | NO |
| `.env.production` | NO — values already baked into dist/ |
| `supabase/` | NO |

You can zip `dist/` + `server.cjs` + `package.json` + `package-lock.json` and extract on the server.

---

## Step 4 — cPanel Node.js App Settings

In **cPanel → Setup Node.js App**:

| Field | Value |
|---|---|
| Node.js version | 20.x (or highest available) |
| Application mode | Production |
| Application root | `tamrakar-main` |
| Application URL | `https://tamrakarcomplex.com/` |
| Application startup file | `server.cjs` |

**Environment variables** (set in cPanel UI):

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | Leave blank (cPanel sets this automatically) |

Do NOT set `VITE_*` vars here — they have no effect at runtime.

---

## Step 5 — Install Dependencies on Server

In cPanel Node.js App panel, click **"Run NPM Install"**.

This installs `express`, `compression`, and other runtime dependencies from `package.json`.

Only `dependencies` are needed at runtime — `devDependencies` are skipped automatically.

---

## Step 6 — Start the Application

Click **"Start App"** (or **"Restart"** if already running).

Verify via: `https://tamrakarcomplex.com/health`

Expected response:
```json
{ "status": "ok", "timestamp": "2026-05-20T..." }
```

---

## Step 7 — Test After Deploy

```
[ ] https://tamrakarcomplex.com/ — homepage loads
[ ] https://tamrakarcomplex.com/health — { status: "ok" }
[ ] /auth — login page loads
[ ] Login as suadmin → /suadmin dashboard
[ ] Login as storeadmin → /storeadmin dashboard
[ ] Login as user → /user dashboard
[ ] Network tab: /assets/*.js files return Cache-Control: max-age=31536000, immutable
[ ] Network tab: index.html returns Cache-Control: no-cache
[ ] Response headers include X-Frame-Options: SAMEORIGIN
[ ] Content-Encoding: gzip in response headers (compression working)
```

---

## Troubleshooting

### App shows blank page
- Check: did you build AFTER setting `.env.production` with real Supabase credentials?
- Open browser DevTools Console — look for 401/403 from Supabase

### App crashes on start
- SSH in and run: `node server.cjs`
- Most common cause: `compression` module missing — run `npm install`

### Routes return 404
- `server.cjs` wildcard catch-all should handle all routes
- Confirm Application startup file is `server.cjs`, not `server.js`

### Supabase connection errors
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env.production` were correct before building
- Test RPC via Supabase dashboard → SQL editor: `select get_my_roles()`

### Old code still showing after redeploy
- Force-clear CDN/proxy cache
- Vite hashes asset filenames — old JS is unreachable; only `index.html` needs cache clearing
- cPanel: Stop App → re-upload dist/ → Start App

---

## Re-deploy Workflow (Subsequent Deploys)

```bash
# 1. Make code changes locally
# 2. npm run build
# 3. Upload new dist/ folder (replace old one)
# 4. In cPanel: Restart App
# No npm install needed unless dependencies changed
```

---

## Supabase Edge Functions (Separate Deployment)

Edge functions are hosted on Supabase infrastructure, not cPanel:

```bash
npx supabase functions deploy --project-ref tvgmnjuexdgtgtqhrjok
```

Run this from your local machine with Supabase CLI installed and authenticated.

---

*Last updated: 2026-05-20*
