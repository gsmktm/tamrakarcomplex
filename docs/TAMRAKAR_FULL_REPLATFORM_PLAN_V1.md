# TamrakarComplex Full Replatform Plan v1

## Summary

Rebuild TamrakarComplex.com as a full-stack Next.js + NestJS/Express + PostgreSQL + Prisma platform while preserving the current Tamrakar design spirit and existing public route contract.

v1 target:

- Full replatform, not incremental Supabase-only patching.
- Preserve existing route names where possible; do not force new prompt aliases unless needed internally.
- Build polished, functional admin/store/customer flows with automated package, referral, point, valuation, SEO, and marketplace logic.
- Keep the Krishna Leela idea only as design philosophy: one central rhythm, many connected stores, graceful customer flow, trust, relationship, and harmony. No religious visual misuse.

## Architecture

- Frontend: Next.js App Router, React, Tailwind, shadcn/ui, Framer Motion.
- Backend: NestJS preferred; Express acceptable only for small gateway services.
- Database: PostgreSQL with Prisma ORM.
- Cache/queue: Redis for referral attribution, async emails/notifications, analytics aggregation, and expiry jobs.
- Auth: JWT access token + refresh token, RBAC permission middleware, HTTP-only refresh cookie.
- Storage: S3-compatible storage for logos, covers, product photos, OG images, banners, and repair/valuation uploads.
- Payments: eSewa, Khalti, bank transfer, manual payment approval.
- SEO: server-rendered metadata, canonical URL, OG/Twitter cards, schema markup, sitemap, robots.

## Route Contract

Preserve current route spirit and avoid breaking existing URLs:

- Public: `/`, `/stores`, `/stores/[slug]`, `/marketplace`, `/repair`, `/exchange-your-phone`, `/sell-your-phone`, `/valuation-estimator`, `/products`, `/product/[slug]`, `/mobile-price`.
- Admin: `/suadmin`, `/staffadmin`, `/storeadmin`, `/user`.
- Store subpages: `/stores/[slug]/products`, `/stores/[slug]/valuation`, `/stores/[slug]/repair`, `/stores/[slug]/exchange`, `/stores/[slug]/accessories`, `/stores/[slug]/offers`.

## Implementation Status In This Repo

The new stack is scaffolded in `replatform/` so the current Vite/Supabase app remains intact while the replatform grows in parallel.

Added:

- Prisma schema for the full target data model.
- Seed defaults for roles, store packages, referral rule, and core SEO page.
- Shared domain package with package defaults, entitlement resolver, limit guard, and referral reward calculation.
- NestJS API skeleton with modules for auth, RBAC, stores, packages, subscriptions, catalog, products, marketplace, valuation, repair, exchange, sell-device, referrals, point wallets, SEO, reports, notifications, and audit logs.
- Next.js App Router scaffold for preserved public/admin routes and store subpages.

## Next Implementation Steps

1. Install replatform dependencies inside `replatform/`.
2. Run Prisma generate and initial migration against a new PostgreSQL database.
3. Add concrete API controllers and DTO validation for each NestJS module.
4. Connect Next.js pages to the API and replace shell content with live data.
5. Add Redis queue workers for subscription expiry, referral approval, point expiry, notifications, and analytics aggregation.
6. Add payment adapters for eSewa, Khalti, bank transfer, and manual approval.
7. Write Supabase-to-Prisma migration scripts and staging cutover checks.

## Test Plan

- Unit tests: package entitlement resolver, referral reward calculation, point wallet balance, RBAC guards, subscription expiry logic.
- API tests: package edit, subscription approval, product limit enforcement, store-scope access, referral click/order/approval, point redemption.
- E2E tests: Super Admin package edit, Store Admin upgrade request, Staff Admin approval, customer referral purchase, customer point redemption.
- Security tests: Store Admin cannot access another store, Store Staff cannot edit package/payment/owner, Staff Admin cannot change core settings without permission, Customer cannot access admin data.
- SEO tests: metadata, canonical, OG image, schema markup, sitemap entries.
- Build/deploy tests: frontend build, backend build, Prisma migration, seed packages, Redis queue worker, payment webhook simulation.

## Assumptions

- Supabase remains only as legacy reference, not the final backend.
- Existing public route spirit should be preserved.
- Current design spirit stays modern, premium, mobile-first, and business-ready.
- Religious symbolism is philosophy only, not literal UI decoration.
