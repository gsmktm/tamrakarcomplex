# Full Project Audit — TamrakarComplex.com

**Date:** 2026-05-21  
**Audited by:** Production Refactor Pass  
**Build status:** PASSING (exit 0, ~47s, no TypeScript errors)

---

## 1. Project Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + TypeScript + Vite 5 SPA |
| Styling | Tailwind CSS 3 + Shadcn/UI (Radix primitives) |
| State | TanStack Query v5 + Zustand |
| Auth/DB | Supabase (project: `tvgmnjuexdgtgtqhrjok`) |
| Routing | React Router v6 |
| Deployment | Vercel (primary) / Netlify / cPanel (Express fallback) |
| Testing | Vitest + Testing Library |

---

## 2. What Exists and Works

### Auth & RBAC
- `useAuth.tsx` — full auth context with RPC-first role resolution (`get_my_roles`), table fallback, metadata fallback. No hardcoded email bypass (fixed in prior session).
- 5-tier roles: `suadmin` > `staffadmin` > `storeadmin` > `storestaff` > `user`
- Route guards: `RequireSuperAdmin`, `RequireStaffAdmin`, `RequireStoreAdmin`, `RequireAuth` — all working, redirect to `/auth` when unauthenticated.
- `RequireStoreAdmin` allows `suadmin` and `staffadmin` pass-through (intentional: support access).

### Routes
- **Public routes** (`/`, `/buy`, `/sell-your-phone`, `/repair`, `/marketplace`, `/stores`, `/services`, `/mobile-price`, `/valuation-estimator`, `/exchange-your-phone`, etc.) — all registered, lazy-loaded.
- **Super Admin** (`/suadmin/*`) — 40+ routes, wrapped in `RequireSuperAdmin` + `SuperAdminLayout` outlet pattern.
- **Staff Admin** (`/staffadmin/*`) — wrapped in `RequireStaffAdmin` + `StaffAdminLayout`.
- **Store Admin** (`/storeadmin/*`) — wrapped in `RequireStoreAdmin` + `StoreAdminLayout`.
- **404** — `NotFound` component catches all unmatched routes.

### Frontend Homepage (Redesigned)
- `HeroSection` — 2-column split layout, Syne Black typography, inline search, 4 CTAs, stat grid.
- `HomeTrustStats` — Reveal scroll animation, saffron accent rule.
- `HomeQuickActions` — 7-tile newspaper grid, scroll reveal.
- `ServiceMatrix` — 6 flat cards, xl:grid-cols-6, hover bottom-sweep.
- `BannerSlider` — removed from homepage.
- Scroll reveal system — `Reveal.tsx` IntersectionObserver component + CSS in `index.css`.

### Database (Supabase)
- 200+ migration files applied to live project.
- Tables confirmed: `profiles`, `user_roles`, `stores`, `products`, `sell_listings`, `marketplace_listings`, `repair_requests`, `unlock_requests`, `orders`, `subscriptions`, `subscription_plans`, `app_settings`, `articles`, `content_pages`, `chatbot_messages`, `audit_logs`, `notifications`, `leads`, `device_catalog`.
- RLS enabled on user/store/admin tables.
- `bootstrap_suadmin_by_email` RPC available for admin setup.
- Key RPCs: `get_my_roles`, `get_super_admin_stats`, `create_order_secure`, `get_store_directory`, `get_valuation`.

### Supabase Edge Functions
- `bootstrap-admin` — seeds first admin
- `create-order-secure` — secure order placement
- `create-payment-session` — eSewa integration
- `verify-payment` — eSewa verification
- `valuation-estimator` — device valuation
- `sitemap` — dynamic sitemap generation
- `newsletter-subscribe` — newsletter opt-in
- `import-gadgetbyte-articles` / `import-gadgetbyte-products` — content importers
- `auto-search-og` — OG image generation

### Admin Panels
- **SuperAdmin**: 40+ management pages — users, stores, products, brands, price list, orders, repairs, unlocking, subscriptions, articles, content, chatbot, SEO, analytics, audit logs, platform health, settings.
- **StaffAdmin**: analytics, products, orders, articles, guides, listings, stores, repairs, unlocking, content, contacts, chatbot, polls, theme, valuation, subscriptions, price list, brands, master data.
- **StoreAdmin**: dashboard, analytics, profile, settings, theme builder, media, team, security, products, orders, listings, repairs, unlocking, leads, payouts, reviews, exchange.

### Services & Data Layer
- `priceListService.ts` — DB-connected price list
- `storeDirectoryService.ts` — DB-connected store directory  
- `sellPhoneService.ts` — sell flow DB operations
- `repairService.ts` — repair request DB operations
- `inventoryService.ts` — stock management
- `masterCatalogService.ts` — device catalog
- `publicFallbackData.ts` — fallback when DB is empty (not replacing DB)

### Upload System
- `ImageUploader` component in `src/components/common/`
- `image-upload` UI component
- Supabase Storage buckets configured via migration `20260430014000_add_storage_buckets.sql`

### Performance
- All routes code-split via `React.lazy` + `Suspense`
- `QueryClient` configured: `staleTime: 5min`, `gcTime: 15min`, `refetchOnWindowFocus: false`
- Vite chunking active (vendor-react, vendor-ui, vendor-supabase, vendor-charts separate bundles)

---

## 3. Issues Found

### 3.1 Design System Inconsistencies

| File | Issue |
|---|---|
| `HomeStoreSpotlight.tsx` | `rounded-[2.5rem]` cards violate `--radius: 0.25rem` design token |
| `HomeMarketplaceFeed.tsx` | `rounded-3xl`, `rounded-[2rem]` violate sharp-corner design system |
| `HomeStoreSpotlight.tsx` | Uses `rounded-full` badge (OK for pill badges, but store card shape wrong) |
| `HomeMarketplaceFeed.tsx` | `rounded-full` badge in "Direct from Owners" (OK) but card wrong |
| `HomeStoreSpotlight.tsx` | No `Reveal` scroll animation — misses stagger effect |
| `HomeMarketplaceFeed.tsx` | No `Reveal` scroll animation |
| `FlagshipShowcase.tsx` | Hardcoded `APPLE_PRODUCTS` / `SAMSUNG_PRODUCTS` arrays — not DB-driven |
| `HomeStoreSpotlight.tsx` | Section heading uses inline emoji badge `Store` icon via `rounded-full` (design: sharp) |

### 3.2 Static / Fake Data Still Present

| File | Issue |
|---|---|
| `FlagshipShowcase.tsx` | Hardcoded product arrays (Apple/Samsung) |
| `ComplexMap.tsx` | Imports from `@/data/basicStoreData` — static floor map data |
| `ExchangeYourPhone.tsx` | Imports `PRODUCTS` from `@/utils/productData` for brand/model picker (fallback only — also queries DB) |
| `pages/UnlockingHub.tsx` | Imports static `ALL_UNLOCKING_SERVICE_OFFERS` from `@/data/unlockingServices` |

### 3.3 Console Statements (Production Leak)

67 `console.log/warn/error` calls in non-test source files. Notable:
- `useAuth.tsx` — `console.info("Auth: get_my_roles RPC result:", ...)` — logs auth data including role info to browser console. Security concern.
- `SuperAdminDashboard.tsx` — `console.info("Dashboard: RPC function successful")` — unnecessary.

### 3.4 Type Safety

- `supabase` client exported as `any` (`supabaseTyped as any`) — intentional workaround for schema drift but creates type gaps.
- `ProfileOverview.tsx` — `total_orders: 0 // TODO: Add real counts` — hardcoded zero.

### 3.5 Env / Config

- No `.env` file committed (correct). `.env.example` present and correct.
- `.env.production` exists (check: should not contain secrets).
- `VITE_ESEWA_SUCCESS_URL` in `.env.example` still points to `localhost:8080` — should be updated to production URL.
- `vercel.json` sitemap rewrite hardcodes Supabase project URL — acceptable but worth noting.

### 3.6 Security

- `RequireStoreAdmin` frontend guard only — backend RLS and `suadmin` bypass is intentional.
- No service_role key in frontend (correct — anon key only).
- Auth console logs could reveal role info in browser devtools.

### 3.7 Missing / Incomplete

| Area | Gap |
|---|---|
| ProfileOverview | `total_orders` always 0 |
| Scroll reveal | `HomeStoreSpotlight`, `HomeMarketplaceFeed` not wrapped |
| FlagshipShowcase | Not DB-connected |
| Tests | 3 test files, minimal coverage — `core_flows.test.ts` covers basic flows |

---

## 4. What is Broken

Nothing is **broken** (build passes, no runtime errors found in static analysis). Issues are quality/design/completeness:

- Store cards use wrong border-radius (cosmetic)
- Flagship Showcase shows hardcoded products (functional but not CMS-driven)
- ProfileOverview order count always 0 (data gap)
- Console logs in production build (observability/security concern)

---

## 5. Route Inventory

### Public (sample)
```
/                         Homepage
/buy                      Product listing
/products/:id             Product detail
/sell-your-phone          Sell flow
/exchange-your-phone      Exchange flow
/repair                   Repair hub
/marketplace              Marketplace browse
/marketplace/:id          Listing detail
/stores                   Store directory
/stores/:slug             Store detail
/mobile-price             Price list
/valuation-estimator      Device valuation
/auth                     Login/Register
/profile                  User profile
/checkout                 Checkout
/unlocking                Unlocking hub
```

### Protected Admin
```
/suadmin                  Super admin dashboard
/suadmin/users            User management
/suadmin/stores           Store management
/suadmin/products         Product management
/suadmin/price-list       Price list management
/suadmin/orders           Order management
/suadmin/repairs          Repair management
/suadmin/chatbot          Chatbot management
/suadmin/settings         System settings
/suadmin/audit            Audit logs
... (35+ more)

/staffadmin               Staff dashboard
/staffadmin/products      Product management
/staffadmin/orders        Order management
... (25+ more)

/storeadmin               Store owner dashboard
/storeadmin/profile       Store profile
/storeadmin/products      Store products
/storeadmin/orders        Store orders
... (20+ more)
```

---

## 6. Database Assessment

**Status:** Healthy. 200+ migrations applied. No duplicate tables found in last consolidation pass.

**Key Tables:**
- `profiles` — user profiles with role, phone, location
- `user_roles` — 4-panel RBAC role assignments
- `stores` — store directory with verification, subscription status
- `products` — product catalog with variants, pricing
- `marketplace_listings` / `sell_listings` — used device marketplace
- `repair_requests` — full repair flow with tracking
- `unlock_requests` — device unlocking requests
- `orders` / `order_items` — e-commerce orders
- `subscriptions` / `subscription_plans` — store subscription tiers
- `app_settings` — CMS/system settings (editable from admin)
- `articles` / `content_pages` — CMS content
- `chatbot_messages` / `chatbot_training` — AI chatbot
- `audit_logs` — admin action tracking
- `notifications` — in-app notifications
- `device_catalog` — master device database
- `leads` — sell/contact leads

---

## 7. Security Assessment

| Check | Status |
|---|---|
| No service_role key in frontend | PASS |
| RLS on user/store tables | PASS |
| No hardcoded email bypass in auth | PASS (fixed) |
| Frontend route guards | PASS |
| Backend permission checks via RLS | PASS |
| Console logging auth data | WARN — remove for production |
| Input validation (forms use zod + react-hook-form) | PASS |
| Upload validation | PASS (Supabase Storage policies) |
| CORS (Supabase handles) | PASS |

---

## 8. Performance Assessment

| Check | Status |
|---|---|
| Code splitting (lazy routes) | PASS |
| React Query caching (5min stale, 15min gc) | PASS |
| No refetch on window focus | PASS |
| Vendor chunk separation | PASS |
| Largest bundle: vendor-charts 421kB gzip: 112kB | WARN — recharts is heavy; consider dynamic import |
| index.js: 539kB gzip: 139kB | WARN — large, review what's in it |
| Images: no lazy loading enforced | WARN — use `loading="lazy"` on non-hero images |

---

## 9. Fixes Applied This Audit Pass

See `docs/CHANGELOG_REDESIGN_FIX.md` for details.

1. HomeStoreSpotlight — sharp corners, Reveal scroll animation
2. HomeMarketplaceFeed — sharp corners, Reveal scroll animation  
3. ProfileOverview — real order count query
4. Console.info removed from useAuth (role logging)
5. Console.info removed from SuperAdminDashboard
6. `.env.example` — updated eSewa URLs to production placeholder

---

## 10. Remaining Risks

| Risk | Severity | Action |
|---|---|---|
| FlagshipShowcase hardcoded products | Medium | Connect to DB products API |
| `supabase as any` type erasure | Low | Regenerate types when schema stabilizes |
| Recharts 421kB bundle | Low | Dynamic import chart components |
| Console logs (remaining 60+) | Low | Audit and remove pre-production |
| `.env.production` contents | Medium | Verify no secrets committed |

---

## 11. Setup Commands

```bash
# Install
npm install

# Dev
npm run dev

# Build
npm run build

# Test
npm test

# Lint
npm run lint

# Check routes
npm run check-routes
```

## 12. Deployment Notes

**Vercel (recommended):**
- Set env vars in Vercel dashboard (not in `.env` files)
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` required
- Build command: `npm run build`
- Output: `dist/`

**Netlify:**
- `netlify.toml` configured: build `npm run build`, publish `dist/`
- SPA redirect rule in place

**cPanel/Node:**
- `server.cjs` Express server serves `dist/`
- Set `NODE_ENV=production` and `PORT`

**Supabase Edge Functions:**
- Deploy via `supabase functions deploy <name>`
- Set secrets: `SUPABASE_SERVICE_ROLE_KEY`, `ESEWA_MERCHANT_ID`, `ESEWA_SECRET_KEY`, `SITE_URL`
