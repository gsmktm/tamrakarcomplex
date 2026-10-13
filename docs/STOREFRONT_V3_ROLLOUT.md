# Tamrakar Complex — Storefront V3 Design & Rollout

**Status:** Draft PR #3. Original Vite build and regression tests passed; recent commits require current CI review. Mandatory TypeScript errors and production dependency advisories are active release blockers, tracked in issues #4 and #5.
**Scope:** First frontend redesign increment; not a whole-platform rewrite.
**Primary site:** https://tamrakarcomplex.com/
**Codebase:** React / Vite / TypeScript / Tailwind / Supabase.

## Design direction

A premium Nepal-based technology marketplace: midnight navy, restrained antique gold, precise typography, accessible red primary actions, modern spacing, rounded cards, and mobile-first product discovery. Product photographs and descriptions come from the actual product system; the hero artwork is intentionally a generic CSS device representation and makes no specific product claim.

## Implemented in this branch

- Redesigned homepage hero with improved hierarchy, product catalog search, category chips, and direct links to buy, sell, repair, and store pages.
- Restored homepage section settings compatibility with flat and legacy nested CMS values; added regression tests. Previously unlisted configurable homepage sections now receive explicit defaults.
- Added responsive category grid for popular product types and routes to the existing catalog/marketplace.
- Added merchant onboarding and physical map entry points.
- Introduced a scoped `src/styles/storefront-v3.css` visual layer with mobile and reduced-motion adjustments.
- Removed a second homepage chat instance because App.tsx already mounts the global chat widget.
- Brought desktop header and secondary navigation toward the same midnight/gold design language.
- Changed mobile bottom navigation to include a repair shortcut.
- Redesigned `ProductCard` with product/detail anchor separate from action buttons. Add-to-cart, buy-now, and compare are visible without hover and keyboard accessible.
- Polished `ModelCard` for catalog consistency and keyboard focus visibility.
- Converted price-finder product cards to semantic links for keyboard use.
- Corrected the homepage / price-finder / legacy catalog search routes so filters survive redirects.
- Fixed search modal model-result URLs and guarded against stale search responses and searches while closed.
- Removed outdated React Router future flags that conflict with the installed router v7.
- Updated WebSite SearchAction structured data to the canonical catalog route.

## Safety decisions

- No changes to Supabase tables, migrations, RLS, authentication, payment callbacks, order state, or merchant data.
- No hardcoded store counts, prices, inventory, testimonials, or rating claims introduced.
- Existing public routes remain available, including legacy `/buy`, `/shop`, `/products`, and `/explore`.
- Existing CMS-controlled homepage sections remain intact.
- Existing admin, staff, store-admin and user panels retain their routes and data contracts.

## Known release blocker

GitHub Actions mandatory CI type-check failed on the first V3 branch commit with approximately **1,851 TypeScript errors across 152 files**. The primary categories include stale generated Supabase types versus newer schema migrations, missing RPC/column definitions, and role/test-type mismatches. Connected Supabase access does not include the Tamrakar project's database, so schema regeneration is not currently grounded. This is tracked in [issue #4](https://github.com/gsmktm/tamrakarcomplex/issues/4). Do not skip type-check or disable typing to obtain a green CI badge.

## Security dependency blocker

Enforcing the production `npm audit --omit=dev --audit-level=high` check exposed **10 existing advisories (6 high, 3 moderate, 1 low)**. Previously `continue-on-error: true` allowed the audit job to succeed despite vulnerabilities. The audit now correctly fails. See [issue #5](https://github.com/gsmktm/tamrakarcomplex/issues/5). Remediation requires updating the npm lockfile in a verified online workspace; some transitive advisories have no published patch and need scoped review. Do not claim that all security scans passed or that security is certified.

## Agent and sub-agent configuration

Root `AGENTS.md` and `.github/copilot-instructions.md` now describe the Tamrakar Complex system instead of an unrelated research app. Five repository GitHub Copilot agent profiles are configured under `.github/agents/`: technical lead, schema integrity, frontend craft, security review, and test reliability. Profiles prepare bounded delegation when run in a supporting GitHub Copilot environment; **they do not launch agents automatically or prove that any agent was run**.

Search in the global dialog is now read-only while typing. The prior automatic `log_search_and_build_auto_page` RPC is not called on keystrokes; SEO-page publishing should occur through a separately authorized administrative workflow. Search result routing, default catalog fallback and legacy redirects have regression tests.

A diagnostic-only TypeScript inventory is available through `scripts/typecheck-inventory.cjs` and uploaded as a GitHub Actions artifact. Mandatory strict TypeScript CI remains unchanged.

## Verification still required

The Vite build, unit tests and route checks passed in original independent regression run 38072213634; the new tests and scripts need current-head verification. Initial security jobs were green because audit findings did not fail the job. The fixed audit gate has now exposed the dependency issues above. These results do not supersede the mandatory failing strict TypeScript check, and end-to-end browser and production payment tests remain unverified. Run from a checked-out copy:

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
