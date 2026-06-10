# Deployment Ready Checklist

**TamrakarComplex.com — Production Deployment**  
**Last updated:** 2026-05-21

---

## Pre-Deployment

### Code

- [x] `npm run build` passes (exit 0, no TS errors)
- [x] `npm test` passes (vitest)
- [x] All routes registered and lazy-loaded
- [x] No hardcoded secrets in source code
- [x] No hardcoded email bypass in auth
- [x] RLS enabled on all user/store/admin tables
- [x] Supabase anon key only in frontend (no service_role)
- [x] Console.info auth logs removed from production code
- [ ] Full lint pass: `npm run lint` (review remaining warnings)

### Environment Variables (set in hosting platform, NOT in .env files)

```
VITE_SUPABASE_URL=https://tvgmnjuexdgtgtqhrjok.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon key from Supabase dashboard>
VITE_ESEWA_MERCHANT_ID=<your eSewa merchant ID>
VITE_ESEWA_SUCCESS_URL=https://tamrakarcomplex.com/checkout/success
VITE_ESEWA_FAILURE_URL=https://tamrakarcomplex.com/checkout/failure
VITE_ESEWA_ENABLED=false         # set true when ready to go live with payments
VITE_REQUIRE_SUBSCRIPTION=true
```

### Supabase Edge Function Secrets (set in Supabase dashboard > Edge Functions > Secrets)

```
SUPABASE_SERVICE_ROLE_KEY=<service role key>
ESEWA_MERCHANT_ID=<your merchant ID>
ESEWA_SECRET_KEY=<your secret key>
SITE_URL=https://tamrakarcomplex.com
ALLOWED_ORIGINS=https://tamrakarcomplex.com
```

### Supabase Edge Functions (deploy before going live)

```bash
supabase functions deploy bootstrap-admin
supabase functions deploy create-order-secure
supabase functions deploy create-payment-session
supabase functions deploy verify-payment
supabase functions deploy valuation-estimator
supabase functions deploy sitemap
supabase functions deploy newsletter-subscribe
supabase functions deploy auto-search-og
```

### Database

- [x] All migrations applied to live project
- [x] RLS policies active
- [ ] Run `SELECT bootstrap_suadmin_by_email('gsmktm@gmail.com');` to set up super admin
- [ ] Verify `app_settings` table has at least one row (site settings)
- [ ] Verify storage buckets exist: `store-logos`, `product-images`, `avatars`
- [ ] Test: super admin can log in at `/auth` and access `/suadmin`

### DNS & Domain

- [ ] `tamrakarcomplex.com` pointed to Vercel/Netlify
- [ ] HTTPS active (auto via Vercel/Netlify)
- [ ] `www.` redirect to apex or vice versa configured

---

## Vercel Deployment

1. Connect GitHub repo to Vercel
2. Framework preset: Vite
3. Build command: `npm run build`
4. Output directory: `dist`
5. Set all env vars in Vercel dashboard > Settings > Environment Variables
6. Deploy

`vercel.json` already handles:
- SPA fallback (`/*` → `/index.html`)
- Sitemap proxy (`/sitemap.xml` → Edge Function)

---

## Netlify Deployment

`netlify.toml` handles build + SPA redirect. Set env vars in Netlify dashboard.

---

## cPanel / VPS Deployment

```bash
# Build
npm run build

# Upload dist/ to public_html (or subdirectory)
# Set Node.js app to run server.cjs if using Express
NODE_ENV=production PORT=3000 node server.cjs
```

---

## Post-Deployment Verification

- [ ] Homepage loads at `tamrakarcomplex.com`
- [ ] `/auth` login works
- [ ] Super admin login → redirected to `/suadmin`
- [ ] `/suadmin` dashboard shows live stats
- [ ] `/stores` shows stores from database
- [ ] `/mobile-price` shows price list from database
- [ ] `/sell-your-phone` flow submits correctly
- [ ] `/repair` booking form submits correctly
- [ ] Image uploads work (test store logo upload in storeadmin)
- [ ] Chatbot widget loads
- [ ] Sitemap accessible at `/sitemap.xml`
- [ ] Mobile responsive on iPhone/Android screen sizes

---

## Performance Targets

| Metric | Target |
|---|---|
| LCP | < 2.5s |
| FID | < 100ms |
| CLS | < 0.1 |
| Bundle gzip (total) | < 500kB |
| First load JS | < 200kB |

Use [PageSpeed Insights](https://pagespeed.web.dev/) after deploy.

---

## Security Checklist

- [ ] No `.env` files with real secrets committed to git
- [ ] Supabase service role key NOT in frontend code
- [ ] CORS restricted to `tamrakarcomplex.com` in Edge Function secrets
- [ ] Admin routes redirect unauthenticated users to `/auth`
- [ ] RLS tested: regular user cannot read other users' orders/profiles
- [ ] File upload: test uploading an oversized file (should reject)
- [ ] Rate limiting: Supabase has built-in rate limiting on auth endpoints

---

## Monitoring

- Supabase dashboard: https://supabase.com/dashboard/project/tvgmnjuexdgtgtqhrjok
- Error tracking: consider adding Sentry (not yet integrated)
- Analytics: visitor tracking via `visitor_logs` table (built in)
- Platform health: `/suadmin/health` page
- Audit logs: `/suadmin/audit` page
