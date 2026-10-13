# Deployment Guide

This project is a React/Vite SPA backed by Supabase. It can be deployed to Vercel, Netlify, or a cPanel Node.js server.

---

## Step 1 — Supabase Database Setup

### 1a. Release gates before any database change

**STOP: the complete historical migration replay and strict TypeScript CI
have not passed. Do not run `supabase db push`, apply old SQL patches
in the dashboard, or link this repository to a live database until these
checks have passed.**

The `supabase/migrations/` folder contains hundreds of timestamped
historical SQL files, including obsolete credentials bootstrap, incompatible
legacy RPC definitions, and overlapping order schemas. This history is being
repaired and verified in the **isolated Docker migration smoke workflow**.
A successful frontend build or passing dependency audit is **not** approval
to apply migrations.

For an authorized upgrade, first:

1. Connect the **correct Tamrakar Complex** Supabase project, not any other
   project associated with your account.
2. Take and verify a restorable database backup.
3. Compare `supabase_migrations.schema_migrations` against the Git history
   **read-only**. Editing an already applied migration does not repair the live DB.
4. Run full isolated migration replay, regenerate schema types, pass strict
   TypeScript, RLS/role, payment-method, and idempotency regression tests.
5. Review the exact additive migrations for the live schema before authorizing
   any production application.

**Never** seed admins by modifying `auth.users` or `auth.identities` in
migration SQL, use committed passwords, or insert fake
`supabase_migrations.schema_migrations` rows. Auth admin provisioning and
role grants require explicit owner approval and an audited administrative
workflow.

### 1b. Controlled migration process (only after the release gates pass)

```sh
# Verify target and history BEFORE initiating any remote migration
supabase projects list
supabase migration list --linked
# Review locally generated schema types and diffs first.
# Do not run supabase db push until the correct project,
# backup, reviewed migration plan, and release approvals are established.
```

See `docs/DATABASE_MIGRATION_CONSOLIDATION_20261013.md` for the
quarantined scripts and release procedure.

### 1c. Storage Buckets

The migration `20260430014000_add_storage_buckets.sql` creates the required storage buckets. Verify in **Supabase Dashboard → Storage** that the following buckets exist:

- `product-images`
- `store-assets`
- `repair-guide-images`
- `user-avatars`
- `article-images`

If they do not exist, investigate migration history and prepare a reviewed, additive fix. Do not run a historical migration manually against production.

---

## Step 2 — Deploy Edge Functions

From the project root with Supabase CLI linked:

```sh
supabase functions deploy create-payment-session
supabase functions deploy valuation-estimator
supabase functions deploy import-gadgetbyte-articles
supabase functions deploy import-gadgetbyte-products
supabase functions deploy verify-payment
supabase functions deploy newsletter-subscribe
supabase functions deploy sitemap
```

### Edge Function Secrets

In **Supabase Dashboard → Project → Edge Functions → Secrets**, add:

| Secret | Value | Required By |
|---|---|---|
| `ESEWA_MERCHANT_ID` | Your eSewa merchant ID | `create-payment-session` |
| `ESEWA_SECRET_KEY` | Your eSewa secret key | `create-payment-session` |
| `SITE_URL` | `https://tamrakarcomplex.com` | `create-payment-session` |
| `SUPABASE_SERVICE_ROLE_KEY` | Project service role key | `valuation-estimator`, `bootstrap-admin` |
| `ALLOWED_ORIGINS` | `https://tamrakarcomplex.com` | All functions (CORS) |

> `SUPABASE_URL` and `SUPABASE_ANON_KEY` are injected automatically by Supabase — do not set them manually.

---

## Step 3 — Deploy Frontend

### Option A: Vercel (Recommended)

1. Merge only after required checks pass and release approval is recorded. A branch merge may trigger automatic deployment.
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → select your repo.
3. Framework preset: **Vite** (auto-detected).
4. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_ESEWA_ENABLED` = `true` (if using eSewa)
   - `VITE_REQUIRE_SUBSCRIPTION` = `true` (or `false` to disable subscription gating)
5. Click **Deploy**.

SPA routing is handled by `vercel.json` (already configured).

### Option B: Netlify

1. Push code to GitHub.
2. Go to [netlify.com](https://netlify.com) → **Add new site** → **Import existing project**.
3. Build command: `npm run build` | Publish directory: `dist`.
4. Add the same environment variables as Option A.
5. Click **Deploy**.

SPA routing is handled by `netlify.toml` (already configured).

### Option C: cPanel Node.js

1. Run `npm run build` locally to generate the `dist/` folder.
2. Upload all files (including `dist/`, `package.json`, `server.cjs`) to your cPanel app root.
3. In cPanel Node.js Selector:
   - Node.js version: `20.20.0` or higher
   - Application mode: `production`
   - Application startup file: `server.cjs`
4. Add environment variables:
   - `NODE_ENV=production`
   - `PORT` (usually provided by cPanel; defaults to `3000`)
   - `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (used at build time, not runtime — bake them in before upload)
5. Click **Run NPM Install** then **Start App**.

---

## Step 4 — Post-Deploy Verification

- [ ] Visit the site and confirm the homepage loads.
- [ ] Log in with an explicitly provisioned authorized administrator test identity and confirm `/suadmin` permissions.
- [ ] Place a test order (COD) and verify the order appears in the suadmin orders panel.
- [ ] Test eSewa with sandbox credentials only after the database checkout contract is verified; do not enable Khalti until its atomic checkout contract and sandbox callbacks are validated.
- [ ] Confirm the valuation estimator returns a price estimate.
- [ ] Check **Supabase Dashboard → Logs → Edge Functions** for any runtime errors.

---

## Troubleshooting

**Page Not Found on Refresh**
SPA routing rewrites are already configured in `vercel.json` and `netlify.toml`. For other hosts, redirect all `/*` requests to `/index.html`.

**Supabase Connection Error**
Double-check `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in your host's environment variables dashboard.

**eSewa "configuration missing" error**
Set `ESEWA_MERCHANT_ID`, `ESEWA_SECRET_KEY`, and `SITE_URL` in Supabase Edge Function Secrets.

**Empty product/repair listings in production**
Seed the database: `app_settings`, `products`, `repair_categories`, `repair_devices`, `device_catalog` must have rows. The app will show empty state (not demo data) in production mode.

**`suadmin` panel inaccessible after login**
Verify the identity and effective roles through an authorized Supabase Auth administration workflow and read-only role queries. Never execute legacy `fix_suadmin.sql` scripts or create privileged accounts with a migration.
