# Deployment Guide

This project is a React/Vite SPA backed by Supabase. It can be deployed to Vercel, Netlify, or a cPanel Node.js server.

---

## Step 1 — Supabase Database Setup

### 1a. Run All Migrations

From your project root (with Supabase CLI installed and linked):

```sh
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

This runs all ~162 migration files in `supabase/migrations/` in chronological order.

> **Important:** After `supabase db push`, also run these two files manually in the Supabase SQL Editor — they are not timestamped and will not be picked up automatically:
> - `supabase/migrations/fix_gsmktm_suadmin.sql`
> - `supabase/migrations/repair_service_fix_all.sql`

### 1b. Run Fix Patches

Run the following SQL files in the **Supabase Dashboard → SQL Editor** in this order:

1. `fix_app_settings_policy.sql` — fixes `app_settings` write access for suadmin
2. `fix_products_policy.sql` — fixes products RLS for suadmin
3. `fix_repairs_policy.sql` — fixes repair_requests RLS
4. `fix_stores_policy.sql` — fixes stores RLS for suadmin
5. `fix_suadmin.sql` — creates the `suadmin@tamrakarcomplex.com` account

### 1c. Storage Buckets

The migration `20260430014000_add_storage_buckets.sql` creates the required storage buckets. Verify in **Supabase Dashboard → Storage** that the following buckets exist:

- `product-images`
- `store-assets`
- `repair-guide-images`
- `user-avatars`
- `article-images`

If they don't exist, run that migration manually.

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

1. Push code to GitHub.
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
- [ ] Log in as `suadmin@tamrakarcomplex.com` and confirm `/suadmin` panel is accessible.
- [ ] Place a test order (COD) and verify the order appears in the suadmin orders panel.
- [ ] Test eSewa checkout if enabled (use eSewa test credentials first).
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
Run `fix_suadmin.sql` in the Supabase SQL Editor to ensure the account exists with the correct role.
