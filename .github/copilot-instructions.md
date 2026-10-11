# Copilot instructions — Tamrakar Complex

This is **Tamrakar Complex**, the New Road, Kathmandu, Nepal gadget marketplace and store/repair operating system. Do not follow historical instructions for unrelated platforms such as Jetro.

## Existing architecture
- React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui, React Router, TanStack Query.
- Supabase Auth, PostgreSQL, RLS, Storage, and Edge Functions. The real project ref is found in `src/integrations/supabase/client.ts`, not in other connected projects.
- Routes: `src/routes/publicRoutes.tsx`, `superAdminRoutes.tsx`, `staffAdminRoutes.tsx`, `storeAdminRoutes.tsx`.
- Auth guards: `RequireAuth`, `RequireSuperAdmin`, `RequireStaffAdmin`, `RequireStoreAdmin`.
- User roles: `suadmin`, `staffadmin`, `storeadmin`, `storestaff`, `user`.
- Never replace working business modules with static mockups.

## Invariants
- Never change or deploy production systems, write live data, apply migrations, publish, send communications, or merge a PR without explicit, task-specific permission.
- Branch + draft PR first. Preserve ongoing work, public URLs, and backward-compatible database access.
- Check actual SQL migrations, live schema (if authorized), RLS, and checked-in TypeScript types before touching Supabase queries. Do **not** connect to a different Supabase project or fabricate a schema.
- No blanket `any`, `@ts-nocheck`, mass `@ts-ignore`, `skipLibCheck` changes, compiler bypasses, or CI `continue-on-error` for real failures.
- Any purchase, payment, refund, inventory, user-role change, or staff action must have a real authorized backend, server-side validation, audit trail where applicable, and recoverable errors.
- No invented stores, counts, discounts, ratings, availability, or payment status.
- All interactive items must work through real routes/services. Meet WCAG 2.2 AA where practical; keyboard/tab/touch, empty/loading/error states; responsive from 320px.
- No secret keys or `service_role` in the browser. Enforce ownership with RLS, not user-editable metadata. No unsafe `SECURITY DEFINER` shortcuts.

## Work procedure
1. Inspect target files and existing tests before editing. Read `docs/AI_ARCHITECTURE.md`, `docs/AI_BUILD_GUIDE.md`, and `docs/STOREFRONT_V3_ROLLOUT.md`.
2. Select the smallest independently verifiable scope and list intended contracts to preserve.
3. Implement a minimal patch and regression tests on the existing feature/PR branch.
4. Run `npm ci`, `npx tsc -p tsconfig.app.json --noEmit`, `npm run lint`, `npm test`, `npm run check-routes`, `npm run check:migrations`, `npm run build`, `npm run chrome:check` when applicable.
5. Report exact status: tests run/passed/failed, code paths changed, live checks that were unavailable. Do not call the whole project 'fixed' while mandatory CI is red.
6. Document and isolate blockers rather than suppressing errors; verify the database project identity before generating types or SQL migrations.

Use the specialist profiles in `.github/agents/` for bounded research/review tasks. Agents are configurations, not proof that a task has been executed.
