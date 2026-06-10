# Tamrakar Complex — Full Production Overhaul Report

**Date:** 2026-05-20  
**Engineer:** Production Refactor Session  
**Branch:** main

---

## 1. Project Overview

Tamrakar Complex is a full-stack Nepal-first gadget marketplace platform built on:

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS + Shadcn/UI |
| State | TanStack Query v5 + Zustand |
| Routing | React Router v6 with lazy code splitting |
| Backend | Supabase (PostgreSQL + Auth + Edge Functions + Storage) |
| Deployment | cPanel Node.js (`server.cjs`) or Netlify/Vercel |
| Payments | eSewa (Nepal) |

---

## 2. Audit Findings

### 2.1 What Was Working

- Build pipeline (Vite) compiles without errors
- 4-panel RBAC: `suadmin → staffadmin → storeadmin → storestaff → user`
- All route files structured with role guards (`RequireSuperAdmin`, `RequireStoreAdmin`, etc.)
- 150+ database migrations covering comprehensive schema
- Super admin dashboard with RPC stats (`get_super_admin_stats`)
- Store subscription tier system: `free / silver / gold / diamond`
- Real-time notifications via Supabase channels
- CMS-driven homepage via `useHomepageSettings()` hook
- Admin pages for: stores, products, brands, articles, guides, repair, unlocking, valuation, chatbot, campaigns
- Store admin dashboard with proper multi-store support
- Staff admin permission matrix
- `.env.example` documented and present
- Supabase Edge Functions: valuation, payment, sitemap, newsletter, import utilities
- Store entitlements system with package enforcement

### 2.2 Issues Found & Fixed

| # | Issue | Severity | Status |
|---|---|---|---|
| 1 | Hardcoded email bypass list in `useAuth.tsx` | CRITICAL | Fixed |
| 2 | Main bundle 2.1MB (no code splitting on suadmin routes) | HIGH | Fixed |
| 3 | SQL file in React component folder | MEDIUM | Fixed |
| 4 | `storestaff` role missing from `AppRole` type | MEDIUM | Fixed |
| 5 | Notification real-time channel not scoped to user | MEDIUM | Fixed |
| 6 | `storestaff` not in role resolution cascade | LOW | Fixed |

### 2.3 What Was Left Intentionally

- **Static fallback data** (`publicFallbackData.ts`, `productData.ts`): Used as legitimate fallback when Supabase returns empty results. Remove when DB products table is fully seeded.
- **`supabase` typed as `any`**: Intentional workaround for schema drift. Fix by re-running `npx supabase gen types typescript`.
- **Multiple SQL migration files** with manual fixes: History of iteration — safe to leave, don't re-run.

---

## 3. Changes Made

### 3.1 Security Fix — `src/hooks/useAuth.tsx`

**Before:** Lines 90–109 contained a hardcoded list of email addresses that bypassed the database role check and granted `suadmin` privileges to anyone logging in with those emails, even if their DB role was `user`.

```ts
// REMOVED — security bypass:
const superAdminEmails = [
  'gsmktm@gmail.com',
  'timrobani@gmail.com',
  // ...
];
if (superAdminEmails.includes(email)) finalRole = "suadmin";
```

**After:** Role resolution flows exclusively through:
1. `get_my_roles` RPC (preferred)
2. `user_roles` table direct query (fallback)
3. `app_metadata.role` / `user_metadata.role` (last resort)

No email-based bypass exists. All suadmin access requires a database record.

### 3.2 Performance — Code Splitting

**Before:** `superAdminRoutes.tsx` eagerly imported all 40+ admin page components at app startup. Main bundle: **2.1 MB** (557 KB gzipped).

**After:** All super admin routes lazy-loaded via `React.lazy()`. Added Vite manual chunks in `vite.config.ts`:

```
vendor-react     → React + ReactDOM + React Router
vendor-query     → TanStack Query
vendor-supabase  → @supabase/supabase-js
vendor-ui        → Radix UI primitives
vendor-form      → React Hook Form + Zod
vendor-charts    → Recharts
vendor-utils     → date-fns, clsx, tailwind-merge
```

Main bundle: **538 KB** (138 KB gzipped) — **75% reduction**.

### 3.3 File Cleanup

- Moved `src/components/layout/-- Super Admin Dashboard Statistics RPC.sql` → `docs/sql/super_admin_stats_rpc.sql`

### 3.4 Type System — `src/types/app.ts` + `src/lib/roles.ts`

Added `storestaff` to `AppRole` union type:

```ts
export type AppRole =
  | "suadmin" | "staffadmin" | "storeadmin" | "storestaff" | "user";
```

Updated `normalizeRole()` to map `"storestaff"`, `"store_staff"`, `"staff"` → `"storestaff"`.  
Updated role cascade in `useAuth.tsx` to include `storestaff` priority position.  
Added `"Store Staff"` label to `getRoleLabel()`.

### 3.5 Notification Security — `src/hooks/useNotifications.ts`

**Before:** Subscribed to `public:notifications` channel — receives all inserts for all users before RLS filter.

**After:** Scoped to `private:notifications:{userId}` with server-side filter `user_id=eq.{userId}`. Added client-side guard to skip toast if `user_id` doesn't match current user.

---

## 4. Database Structure (Current)

The DB has 150+ migrations. Key tables:

### Core
- `profiles` — user profiles, referral codes, points
- `user_roles` — RBAC assignments (suadmin / staffadmin / storeadmin / storestaff / user)
- `app_settings` — site-wide settings JSON (CMS, features, theme)

### Stores
- `stores` — store directory with subscription info
- `store_admins` — store → admin mappings
- `store_subscriptions` + `packages` — tier system (free/silver/gold/diamond)
- `store_pages` — CMS pages per store

### Commerce
- `products` / `catalog_products` — product catalog
- `brands` / `device_models` / `device_catalog` — mobile master DB
- `orders` / `order_items` — order management
- `sell_listings` — marketplace listings
- `repair_requests` — repair bookings
- `unlock_requests` — unlocking service
- `sell_phone_leads` / `leads_quotes` — sell/trade-in leads
- `valuation_rules` — automated valuation engine

### Content
- `articles` / `guides` — editorial content
- `content_pages` — CMS pages
- `marketing_banners` — homepage banners
- `homepage_sections` — CMS section control
- `polls` / `comments` — community features

### System
- `notifications` — real-time notification system
- `audit_logs` — admin action tracking
- `contact_messages` — customer queries
- `visitor_tracking` — analytics

---

## 5. Role & Permission System

```
suadmin    → full platform access, all RPCs, schema admin
staffadmin → assigned modules via staff_permissions table
storeadmin → own stores only (via store_admins table)
storestaff → store operational access (inventory, orders)
user       → own profile, orders, repair history
```

Backend enforcement: all privileged RPCs check `user_roles` table via `SECURITY DEFINER` functions. RLS policies enforce row-level data isolation.

Frontend enforcement: route guards (`RequireSuperAdmin`, `RequireStoreAdmin`, etc.) + `RequireStaffAdmin` with module/action checks.

---

## 6. API Endpoints

### Supabase Edge Functions
| Function | Purpose |
|---|---|
| `create-order-secure` | Atomic order creation with stock deduction |
| `create-payment-session` | eSewa payment session |
| `verify-payment` | eSewa payment verification |
| `valuation-estimator` | AI-powered device valuation |
| `bootstrap-admin` | Initial super admin setup |
| `sitemap` | Dynamic XML sitemap |
| `newsletter-subscribe` | Newsletter opt-in |
| `import-gadgetbyte-articles` | Article import utility |
| `import-gadgetbyte-products` | Product import utility |
| `auto-search-og` | OG image generation for auto-search pages |

### Key RPCs
| RPC | Access |
|---|---|
| `get_my_roles()` | Any authenticated user |
| `get_super_admin_stats()` | suadmin only |
| `get_admin_users_list_secure()` | suadmin / staffadmin |
| `create_user_admin()` | suadmin only |
| `assign_store_admin_by_email()` | suadmin only |
| `create_order_rpc()` | Authenticated users |
| `get_repair_tracking()` | Public |
| `get_stores_directory()` | Public |
| `bootstrap_suadmin_by_email()` | Service role only |

---

## 7. Security Improvements

1. **Removed email bypass** — no hardcoded credentials in source code
2. **Notification channel scoping** — real-time events filtered by user ID
3. **All RPCs** use `SECURITY DEFINER` + role check before executing
4. **RLS policies** on all tables — no direct table access without auth
5. **File uploads** go through Supabase Storage with bucket policies
6. **eSewa webhook** verification via HMAC in edge function
7. **CORS** configured in edge functions shared helper

---

## 8. Cloud Deployment

### Environment Variables Required

```env
# Frontend (public — safe to commit)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key

# Optional feature flags
VITE_ESEWA_ENABLED=false
VITE_ESEWA_MERCHANT_ID=EPAYTEST
VITE_REQUIRE_SUBSCRIPTION=true

# Supabase Edge Function Secrets (set in Supabase dashboard)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ESEWA_MERCHANT_ID=your-merchant-id
ESEWA_SECRET_KEY=your-secret-key
SITE_URL=https://tamrakarcomplex.com
```

### Build Commands

```bash
npm install          # Install dependencies
npm run build        # Production build → dist/
npm start            # cPanel Node.js server (server.cjs)
npm run dev          # Development server (port 8080)
```

### Supabase

```bash
npx supabase db push          # Apply pending migrations
npx supabase functions deploy  # Deploy all edge functions
npx supabase gen types typescript > src/integrations/supabase/types.ts
```

---

## 9. Remaining Risks

| Risk | Impact | Recommendation |
|---|---|---|
| `supabase` typed as `any` | TS errors hidden at compile | Re-run type gen after each migration |
| Static fallback data masks empty DB | UX confusion | Remove `publicFallbackData.ts` when products table seeded |
| No rate limiting on public APIs | DDoS surface | Add Supabase rate limiting or edge middleware |
| eSewa integration test-mode | Payments not real | Set `VITE_ESEWA_ENABLED=true` and real credentials for production |
| `catalog_products` vs `products` table split | Data confusion | Consolidate or clearly document both tables' purpose |
| 150+ migrations are not idempotent | Re-run risk | Do not re-run old migrations; only add new ones |

---

## 10. Next Phase Suggestions

### Phase 2 — Feature Completion
1. **Upload system**: Add image compression on upload; validate file type/size in `ImageUploader`
2. **Product/catalog unification**: Merge `products` and `catalog_products` or clearly separate their roles
3. **Chatbot training UI**: Complete the admin training data interface in `ChatBotManager`
4. **Price list**: Connect `PriceListManager` to `catalog_products` with brand → model → variant hierarchy
5. **Order tracking**: Full order status timeline with push notifications

### Phase 3 — Performance
1. **Image optimization**: Add WebP conversion for uploads
2. **Edge caching**: Cache public store/product queries at CDN edge
3. **React Query stale time**: Tune per-query to reduce redundant fetches
4. **`StoreDetail.tsx`**: 87KB chunk — split into sub-routes

### Phase 4 — Production Hardening
1. Re-generate Supabase TypeScript types: `npx supabase gen types`
2. Add error monitoring (Sentry or LogFlare)
3. Set up automated DB backups schedule in Supabase
4. Enable Supabase `pg_stat_statements` for slow query analysis
5. Review all `SECURITY DEFINER` functions for SQL injection vectors

---

## 11. Test Checklist

```
[ ] npm install — no errors
[ ] npm run build — passes (builds in ~47s)
[ ] npm run dev — dev server starts on :8080
[ ] Login as suadmin → /suadmin dashboard loads
[ ] Login as storeadmin → /storeadmin dashboard loads  
[ ] Login as user → /user dashboard loads
[ ] Unauthenticated → /auth redirect works
[ ] Suadmin can access all 40+ suadmin routes
[ ] Store admin cannot access suadmin routes
[ ] Homepage sections load from DB
[ ] Hero title/subtitle from app_settings
[ ] Banner slider shows marketing_banners
[ ] Product listing queries products table
[ ] Store listing queries stores table
[ ] Repair booking submits to repair_requests
[ ] Sell phone lead creates sell_phone_leads record
[ ] Notifications appear in bell icon
[ ] Super admin dashboard stats RPC works
```

---

*Report generated by production refactor session — 2026-05-20*
