# Full Store Repair Plan

## Objective

Deliver a coherent, verified repair of storefront UX, store package/theme behavior, admin and super-admin flows, frontend/backend routes, and database contracts.

## Workstreams

1. Baseline: run build, lint, tests, route checks, and migration safety checks.
2. Storefront UI/UX: repair responsive layout, navigation/menu links, semantic controls, and visual consistency.
3. Package runtime: ensure package changes propagate through entitlements, subscriptions, themes, routes, and store presentation.
4. Admin surfaces: verify store-admin, staff-admin, and super-admin navigation, permissions, and CRUD flows.
5. Backend/database: reconcile Supabase RPC/schema contracts, RLS-sensitive queries, migrations, and server fallbacks.
6. Integration: merge findings, fix cross-layer defects, and add regression coverage.
7. Verification: build, lint, unit tests, route checks, migration checks, and focused runtime smoke tests.

## Guardrails

- Preserve existing user changes and public URLs unless a broken contract requires an additive compatibility redirect.
- Prefer one canonical package/entitlement computation path.
- Keep migrations additive and idempotent; do not rewrite applied migrations.
- Meet WCAG 2.2 AA expectations for touched UI, including keyboard access and visible focus.
- Avoid speculative redesign that changes the site identity without functional benefit.

## Acceptance Criteria

- Production build succeeds.
- Automated tests and route checks pass.
- Store package changes consistently affect limits, features, storefront theme, and admin messaging.
- Menu destinations resolve to registered routes with appropriate role protection.
- Store/admin/super-admin pages do not rely on inconsistent role or schema assumptions.
- Any remaining environment-dependent database checks are documented precisely.
