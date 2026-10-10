# Tamrakar Complex — Storefront V3 Design & Rollout

**Status:** Implementation branch; pending automated build, browser testing and review.
**Scope:** First frontend redesign increment; not a whole-platform rewrite.
**Primary site:** https://tamrakarcomplex.com/
**Codebase:** React / Vite / TypeScript / Tailwind / Supabase.

## Design direction

A premium Nepal-based technology marketplace: midnight navy, restrained antique gold, precise typography, accessible red primary actions, modern spacing, rounded cards, and mobile-first product discovery. Product photographs and descriptions come from the actual product system; the hero artwork is intentionally a generic CSS device representation and makes no specific product claim.

## Implemented in this branch

- Redesigned homepage hero with improved hierarchy, product catalog search, category chips, and direct links to buy, sell, repair, and store pages.
- Added responsive category grid for popular product types and routes to the existing catalog/marketplace.
- Added merchant onboarding and physical map entry points.
- Introduced a scoped `src/styles/storefront-v3.css` visual layer with mobile and reduced-motion adjustments.
- Brought desktop header and secondary navigation toward the same midnight/gold design language.
- Changed mobile bottom navigation to include a repair shortcut.
- Redesigned `ProductCard` with product/detail anchor separate from action buttons. Add-to-cart, buy-now, and compare are visible without hover and keyboard accessible.
- Polished `ModelCard` for catalog consistency and keyboard focus visibility.
- Converted price-finder product cards to semantic links for keyboard use.
- Corrected the homepage / price-finder / legacy catalog search routes so filters survive redirects.
- Updated WebSite SearchAction structured data to the canonical catalog route.

## Safety decisions

- No changes to Supabase tables, migrations, RLS, authentication, payment callbacks, order state, or merchant data.
- No hardcoded store counts, prices, inventory, testimonials, or rating claims introduced.
- Existing public routes remain available, including legacy `/buy`, `/shop`, `/products`, and `/explore`.
- Existing CMS-controlled homepage sections remain intact.
- Existing admin, staff, store-admin and user panels retain their routes and data contracts.

## Verification still required

The connected GitHub editor does not provide a local installed dependency tree or a browser preview. Run from a checked-out copy:

```bash
npm ci
npm run build
npm test -- --run
npm run lint
npm run check-routes
npm run check:migrations
npm run chrome:check
```

Manually test:

1. Home renders at 320, 375, 768, 1280 and 1440px; no overflow or layout collision.
2. Search query on homepage navigates to `/cat/mobiles?tab=buy&q=<term>` and returns filtered results.
3. `/buy?q=<term>&brand=Apple` retains both `q` and `brand` parameters, with `tab=buy`.
4. Brand category links filter correctly.
5. Product card keyboard tab order: detail → add to cart → buy now → compare.
6. Touchscreen actions work without hover.
7. Out-of-stock cards do not expose Add/Buy actions.
8. Merchant CTA opens `/stores/apply`; complex map CTA opens `/map`.
9. Mobile bottom navigation goes to Repair and hides properly during checkout/auth/admin.
10. All checkout/payment, role permissions, and CMS sections still function exactly as before.

## Next implementation stages

**Phase B — Catalog and commerce:** refine product detail pages, filters, variant state, checkout error UX, carts, order timelines and payment UI without changing privileged operations.

**Phase C — Repairs and store discovery:** form UX, accessible status timelines, store directory, maps and store detail experiences; validate any physical maps against real floor plans.

**Phase D — Four dashboards:** customer, storeadmin, staffadmin and suadmin operational redesign, centrally reusable tables, explicit RBAC states, responsive forms and reports.

**Phase E — Release hardening:** cross-role E2E coverage, storefront conversion tests, accessibility audit, core web vitals, structured data, RLS checks, browser screenshots and release review.

## Success criteria

- Every visible CTA resolves to its intended route or action.
- No fake API states, placeholder statistics, or unapproved checkout/payment integrations.
- WCAG 2.2 AA-oriented focus, navigation and touch behavior.
- No regressions to store-scoped data visibility.
- Complete rollout only after build, test, browser and product-owner validation.
