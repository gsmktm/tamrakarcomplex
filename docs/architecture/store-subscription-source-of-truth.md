# Store subscription source of truth

Status: Accepted — 2026-08-02

## Decision

`store_packages` is the canonical package catalog. `stores.package_id` identifies a store's configured package, while `stores.subscription_status` and `stores.subscription_end_date` determine whether the paid package is currently effective.

At runtime, use `resolveStorePackageContext()` from `src/lib/storePackageRuntime.ts`. It applies this precedence:

1. Joined `package:store_packages(...)` slug.
2. Denormalized `stores.package_slug` compatibility value.
3. Free package fallback.

An expired, inactive, suspended, or explicitly disabled paid subscription resolves to `free`. Package entitlements must always be calculated from the effective package, never from a raw UI label.

## Compatibility

The older `packages` table and `store_subscriptions.package_id -> packages.id` relationship remain available for historical data. New public, store-admin, and super-admin subscription flows must not use that relationship as their package identity source.

Migration `20260802090000_unify_store_package_runtime.sql` backfills `stores.package_id`, synchronizes `package_slug` with the canonical package, and permits public reads/admin management of the package catalog through RLS.

## UI enforcement

- Public directory: logo, verification badge, contact visibility, marketplace access, and placement come from effective entitlements.
- Public pricing: live monthly price, limits, and feature flags come from `store_packages`; built-in definitions provide safe fallback and yearly pricing.
- Store admin: limits and locked features come from `resolveStorePackageContext()`.
- Super admin: package edits target `store_packages`; assignments update `stores.package_id` and subscription dates.

## Validation

Changes to this boundary require resolver regression tests, production build, linked database lint, and browser checks for `/stores` and `/stores/pricing`.
