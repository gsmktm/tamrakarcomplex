# AI Readme

This project is a Vite + React + TypeScript application for Tamrakar Complex, a Nepal tech marketplace with public shopping/content pages, user account flows, store owner tools, staff admin tools, super admin tools, and Supabase-backed data.

Use these docs before editing:

1. `docs/AI_ARCHITECTURE.md` - app structure, routing, providers, auth, UI patterns.
2. `docs/AI_FUNCTION_INDEX.md` - exported hooks, services, utilities, route guards, and edge functions.
3. `docs/AI_DATA_MODEL.md` - Supabase tables, feature areas, RPCs, storage buckets, and migrations.
4. `docs/AI_BUILD_GUIDE.md` - how to run, test, edit safely, and add new features.

## Other Current Documentation

- `README.md` - Main project overview, tech stack, quick start guide, and project status.
- `DEPLOYMENT.md` - Comprehensive deployment instructions for Vercel, Netlify, and cPanel.
- `CHANGELOG.md` - Complete project status, feature checklist, and system status.
- `public/pricing.md` - Machine-readable store subscription pricing data.

## Fast Orientation

- Entry point: `src/main.tsx` renders `src/App.tsx`.
- Providers are composed in `src/App.tsx`: React Query, Helmet, theme, auth, cart, tooltip, toaster, system helpers.
- Route groups live in `src/routes/`:
  - Public/user routes: `src/routes/publicRoutes.tsx`
  - Staff admin: `src/routes/staffAdminRoutes.tsx`
  - Super admin: `src/routes/superAdminRoutes.tsx`
  - Store admin: `src/routes/storeAdminRoutes.tsx`
  - Legacy `/admin/*` redirects: `src/routes/adminRoutes.tsx`
- Supabase client: `src/integrations/supabase/client.ts`.
- Supabase generated types: `src/integrations/supabase/types.ts`.
- Database migrations: `supabase/migrations/`.
- Supabase edge functions: `supabase/functions/`.
- Repo-local AI skill notes: `docs/skills/`.

## Important Repo Facts

- This folder may not be a git repository. Check before assuming git history exists.
- `node_modules/` and `dist/` are present and should normally be ignored.
- The generated Supabase `Database` type can lag behind migrations. The app exports `supabaseTyped` and an intentionally untyped runtime `supabase` client.
- Many admin pages reuse generic manager pages across `suadmin`, `staffadmin`, and `storeadmin`; check route guards and scoped queries before changing shared managers.
