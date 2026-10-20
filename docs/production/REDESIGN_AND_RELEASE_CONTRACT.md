# Tamrakar Complex — Production Redesign Contract
**Audit date:** 2026-10-20  
**Source branch:** `redesign/2026-10-premium-commerce`  
**Scope:** frontend, customer journeys, merchant console, RBAC, routes, database release readiness  
**Important:** Code present does not imply that a production workflow has been verified. This document distinguishes implemented code from checks requiring a staging environment.

## 1. Product identity and target experience

**Position:** Tamrakar Complex is a Nepal-focused connected gadget commerce platform, bringing customers and independent merchants together for buying, resale, repair, comparison, and store discovery.

**Visual direction:** premium modern tech, dark navy and cobalt surfaces with champagne highlights; mobile-first typography; minimal noise; no fabricated inventory, prices, merchant counts, payment success, or verification guarantees.

### Design tokens

| Purpose | Default |
| --- | --- |
| Page canvas | `#F5F7FC` |
| Text | `#13233A` |
| Surface | `#FFFFFF` |
| Primary action | `#315CFF` |
| Primary hover | `#2048DF` |
| Midnight hero | `#091426` → `#101E35` |
| Accent | `#EFD39E` |
| Soft neutral | `#EDF2F9` |
| Muted text | `#607087` |
| Radius | `0.75rem` base |
| Display/body | Syne / Manrope |

**Interaction system:** visible focus, semantic nav landmarks, arrow-key journey tabs, responsive layouts, reduced-motion support, loading/empty/error states, a predictable route per task. Respect color contrast in light and dark themes. Theme customizations should be tested against both.

## 2. End-to-end journey registry

These are existing implementation surfaces and target acceptance criteria, **not** a claim of production verification.

| Persona | UI starting point | Workflow path | Main persistence/entities | Acceptance gate |
| --- | --- | --- | --- | --- |
| Shopper | `/`, `/buy` | Search → catalog filters → product/store details → cart → checkout → order history | `products`, `orders`, `order_items`, payment session | Price, stock, order, seller and payment must reconcile |
| Device seller | `/sell-your-phone` | Device details → valuation → lead/listing → evaluation → accepted offer | `device_catalog`, `sell_phone_leads`, `valuations`, `sell_listings` | No guaranteed payout until confirmed |
| Exchange customer | `/exchange-your-phone` | Redirect with mode → condition → estimate → review → exchange | `exchange_requests`, `valuations`, `orders` | Final delta and offer disclosed |
| Repair customer | `/repair` | Diagnose → repair request → service provider → updates → tracking | `repair_requests`, `repair_services`, `repair_pricing` | Request is created once, tracked by authorized user |
| Store visitor | `/stores` | Directory → profile → merchant contact | `stores`, profile and verified flags | Only published store fields exposed |
| Prospective merchant | `/stores/apply` | Apply → operator review → approval → store onboarding | `store_applications`, `stores`, `store_admins` | Only authorized staff can approve |
| Merchant | `/storeadmin` | Catalog → stock → orders → repairs → leads → payout and analytics | Store-scoped products, orders, staff, payouts | Tenant scoping and permissions enforced by DB |
| Store staff | `/storestaff` (verify registered alias) | Assigned operational modules only | `store_staff`, permissions | Permissions never exceed the merchant's store |
| Staff admin | `/staffadmin` | Scoped reviews / CMS / operations | Module permissions, audit trail | Direct URL and RPC policy both deny unauthorized action |
| Super admin | `/suadmin` | Platform controls → people → stores → publishing → system | `user_roles`, `audit_logs`, configuration | Root role and destructive actions server-validated |

All entities and paths must be reconciled against the actual live schema and route table before launch. Some names are used differently across migration versions.

## 3. What this branch changes

- Introduces a premium design layer in `src/styles/commerce-2026.css`, with a coherent updated default palette.
- Adds `CommerceJourney`: accessible, keyboard-operated tabs connecting buy, sell/exchange, repair, and store onboarding to existing routes. Each flow includes accurate conditional disclosures.
- Fixes the `/buy` redirect so `q`, brand, category, price and hash values survive; includes a dedicated Vitest regression test.
- Replaces merchant workspace navigation with a stable top-level component: filtering no longer remounts the search input. Includes clearer current-page labels, a responsive menu, and focus and aria states.
- Hardens frontend role resolution: strips email-substring elevation, ignores user-editable role metadata, denies privileged access if role verification fails, and disables dev impersonation in production.
- Adds a static production contract check and CI gate. It **does not** substitute for RLS and end-to-end staging tests.

## 4. Database & access-control contract

Production database could **not** be inspected through the connected Supabase account in this session; no live schema migration was executed. The repository has a large historical migration chain. Before applying **any** new SQL:

1. Confirm exactly which Supabase project the deployed site uses. Verify the deployment env and production reference (without exposing secret keys).
2. Snapshot production and run a rehearsal migration on a staging clone. Resolve history drift rather than blindly replaying hundreds of migrations.
3. Inspect the queries in `docs/production/READ_ONLY_DB_AUDIT.sql`; check **all** exposed tables for RLS and grants.
4. Validate authorization with three actual sessions: ordinary customer, merchant (store A), and staff admin. Prove merchant A cannot enumerate/modify merchant B records; ordinary users cannot approve stores, edit payment status, grant roles, or change price.
5. Verify privileged functions and RPC EXECUTE permissions, function owner/search_path, and token freshness.
6. Do not authorize on `user_metadata`. Avoid client-side `service_role` keys. Use idempotency keys for money-moving workflows.
7. Reconcile `orders`, `order_items`, `store_order_fulfillments`, subscription payments, payouts and refunds under retries.
8. Confirm server-side payment callbacks validate signatures/provider records; client success redirects are **not** proof of payment.

## 5. Required QA gates

| Gate | Command or test | Status |
| --- | --- | --- |
| TypeScript | `npx tsc -p tsconfig.app.json --noEmit` | CI pending |
| ESLint | `npm run lint` | CI pending |
| Unit tests | `npm test` | CI pending |
| Route scanner | `npm run check-routes` | CI pending |
| Migration safety | `npm run check:migrations` | CI pending |
| New UX/security contract | `npm run check:production-contract` | CI pending |
| Optimized build | `npm run build` | CI pending |
| Chrome smoke | `npm run chrome:check` | CI pending |
| Mobile a11y at 360px / 390px | Manual and automation | Not verified |
| E2E checkout + eSewa/Khalti sandbox | Payment sandbox | Not verified |
| Permission matrix / RLS | Staging DB test accounts | Not verified |
| Repair & resale full lifecycle | Staging DB | Not verified |
| Transaction idempotency and rollback | Staging DB | Not verified |
| Backup/restore and disaster recovery | Staging rehearsal | Not verified |
| Load test and real user analytics | Staging/production | Not verified |

### Minimum E2E scenarios
- Guest searches `/buy?q=iPhone`, route retains query and renders filtered results.
- Customer completes checkout with a **sandbox** payment, one order is created, retry does not duplicate.
- Failed payment does not mark any order paid; webhook replay has no side effects.
- Device resale estimate clearly identifies provisional value; seller can track their lead.
- Repair enquiry is submitted once and owner-only tracking works.
- Merchant can edit products in own store and cannot see/update another store's inventory.
- Staff cannot access restricted module with direct link or raw API.
- Admin role assignment is verified by DB, never email or user metadata.
- Payment/store onboarding decisions are audit logged with actor, timestamp, affected ID.
- On each core page: empty state, errors, keyboard navigation, responsive screens and SEO metadata work.

## 6. Rollout strategy

**Release candidate, not deploy approval.**
1. Review this branch and resolve CI failures.
2. Compare production deployment code to `main` and confirm hosting provider and environment variables.
3. Validate a staging database and staging payment provider; run the matrix above with synthetic/test user data.
4. Capture visual regressions for public site and each admin persona.
5. Migrate only with approved backup/rollback plan.
6. Deploy only after explicit authorization; monitor order errors, latency, and webhook failures.
7. Verify rollback and disable any faulty flow before exposing to paying customers.

## 7. Deferred work needed for an actual full launch

- Audit every admin module and store-staff permission path; code is substantial and not fully exercised by static checks.
- Resolve the Supabase type generation/schema drift and migration history.
- Verify store tenant isolation in all REST/RPC/Edge Function paths.
- Verify the external live website actually points to this repository and current deployment.
- Complete payment sandbox tests, subscriptions, payouts, refunds, notifications and customer messages.
- Obtain fresh inventory, merchant verification and legal disclosures; do not display unsupported inventory/price claims.
- Finish cross-browser WCAG checks, visual diff tests, and load/performance budget verification.

**Current status:** Implemented redesign and targeted fixes on a review branch. Not certified production-ready and not deployed.
