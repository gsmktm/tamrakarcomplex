# cPanel Deploy + Migration Steps

## 1. Supabase migrations

The production Supabase project `tvgmnjuexdgtgtqhrjok` has already been updated from this machine.

Verified live:

- 12 canonical SEO rows exist.
- `public.generate_seo_sitemap()` returns static, product, brand, store, marketplace listing, repair device, repair guide, and article URLs.
- Supabase advisor critical `ERROR` count is 0.

If applying to another Supabase project, run only SQL files from `supabase/migrations/`. Do not paste frontend files or git diffs into Supabase SQL editor.

Minimum recent migrations for this deployment:

```text
supabase/migrations/20260701090000_seed_canonical_seo_defaults.sql
supabase/migrations/20260701093000_security_advisor_current_critical.sql
```

CLI option:

```bash
supabase db query --linked --file supabase/migrations/20260701090000_seed_canonical_seo_defaults.sql
supabase db query --linked --file supabase/migrations/20260701093000_security_advisor_current_critical.sql
```

SQL editor option:

1. Open the `.sql` file.
2. Copy only SQL, starting from comments or statements like `CREATE`, `ALTER`, `INSERT`, `UPDATE`, `DROP`, `DO`.
3. Never paste lines like `import { useEffect } from "react";`.

## 2. cPanel Node.js app

Upload/extract the deploy zip into the cPanel Node.js application root.

Required cPanel settings:

```text
Node.js: 20.x or newer
Application mode: Production
Startup file: server.cjs
NODE_ENV: production
```

Install runtime packages in cPanel:

```bash
npm install --omit=dev
```

Then restart the Node.js app.

## 3. Post-deploy checks

```text
https://tamrakarcomplex.com/health
https://tamrakarcomplex.com/
https://tamrakarcomplex.com/cat/mobiles
https://tamrakarcomplex.com/stores/article
https://tamrakarcomplex.com/stores/article/iphone-18-series-leak-news
https://tamrakarcomplex.com/suadmin/growth?tab=seo
https://tamrakarcomplex.com/sitemap.xml
```

Expected:

- `/health` returns JSON status ok.
- Frontend routes load without 404.
- `/sitemap.xml` uses canonical `/cat/mobiles` and `/stores/article` URLs.
- `/suadmin/growth?tab=seo` no longer shows the 12 important route templates as missing.
