# Changelog - Tamrakar Complex Platform

**Last Updated:** June 12, 2026  
**Version:** 1.2.0

---

## v1.2.0 — June 12, 2026

### Mobile Hub Catalog (Full Implementation)
- New DB tables: `brands`, `phone_series`, `phone_models`, `phone_variants`, `phone_specs`, `phone_variant_prices`, `price_history`, `expert_scores`, `model_images`, `exchange_values`, and 10+ supporting tables
- Seeded 18 brands (Samsung, Apple, Xiaomi, POCO, Honor, Vivo, Nothing, OnePlus, Realme, OPPO, Infinix, Motorola, ZTE, Ai+, Tecno, Itel, Coolpad, Benco) with ~290 variant price rows and exchange values at good/average/poor grades
- `mobileMasterService` — full CRUD for brands/series/models/variants with price aggregation and client-side filter/sort
- `MobileCategoryPage` — paginated phone listing with search, brand/price/feature filter chips, sort, compare-mode drawer
- `MobileBrandPage` — per-brand phone listing with hero, SEO head, and filter chips
- `MobileMasterManager` admin — brand/series/model hierarchy editor with inline add/edit/delete

### Sell & Exchange Unified Flow
- Merged `/exchange-your-phone` into `/sell-your-phone?mode=exchange` — single unified SellYourPhone page
- `mode` state initialised from URL param; hero and step-5 CTAs set mode inline without navigation
- Lead submission `source` field reflects mode (`sell_your_phone` vs `exchange_your_phone`)
- `/exchange-your-phone` and `/exchange` routes redirect to `/sell-your-phone?mode=exchange`
- Deleted dead `ExchangeYourPhone.tsx` file

### Mobile-First UI Redesign
- Global bottom nav with glass-card styling, 44px touch targets, `matchPrefix` active detection
- Header and NavigationBar updated with glass tokens and mobile-responsive breakpoints
- `ModelCard` component polish — image, price badge, rating strip
- Bottom nav hidden on admin/checkout/auth paths; admin paths now include `staffadmin`, `storeadmin`

### Commerce Hardening (Phase 2 & 3)
- Additive order/repair statuses — no destructive enum changes
- Mandatory `store_id` on commerce records, payout tracking
- Security tests suite + extracted shared pure logic layer

### Bug Fixes
- `MobileMasterManager` — `deleteBrand/deleteSeries/deleteModel` `onSuccess` callbacks now correctly use `(_, id)` signature (React Query v5); `id` was an undefined free variable, silently preventing selection clear after deletion
- `MobileMasterManager` — Brand/Series Select `"all"` sentinel now maps to `null` (`v === "all" ? null : v`); previously passed literal string `"all"` to UUID Supabase queries
- `mobileMasterService` — `minPriceMap` building uses `!(key in map)` instead of `!existing` (falsy-zero for price=0)
- `mobileMasterService` — `filters.minPrice` guard uses `!== undefined` instead of truthy check
- `publicRoutes` — `/cat/mobiles/` trailing slash removed; canonical `/cat/mobiles` now correctly matches `MobileCategoryPage` (was falling through to wildcard `StoreRedirect`)
- `BottomNav` — removed dead `pathname.startsWith(matchPrefix + "?")` branch (pathname never contains query string)
- `ArticleManager` — added missing `handleSupabaseError` import

### Dead Code Removed
- `src/pages/admin/storeadmin/StoreProfile.tsx`
- `src/pages/admin/storeadmin/StoreSubscription.tsx`
- `src/pages/admin/staffadmin/StoresManagement.tsx`
- `src/pages/admin/supadmin/StoresManagement.tsx`
- `src/pages/sell/ExchangeYourPhone.tsx`

---

## 📋 Project Overview

Tamrakar Complex is a full-stack web platform for Nepal's tech marketplace, featuring:
- E-commerce storefront with shopping cart and eSewa/COD payments
- Device repair service booking and tracking
- Device valuation service (with GadgetByte integration)
- Marketplace listings for buying/selling devices
- Multi-role admin panels (super admin, staff admin, store admin)
- AI-powered chat support and article management
- Store directory and store management system
- User authentication, profiles, and order history
- Subscription and package management for stores

---

## ✅ Core Systems Status (May 13, 2026)

### Build & Infrastructure
- **Build Status:** ✅ Production build succeeds with 0 errors
- **Test Status:** ✅ All 41 tests passing
- **Code Quality:** ⚠️ 179 lint warnings (non-blocking, mostly `any` types)
- **Bundle Size:** ~290 kB gzipped (after code split)
- **Node.js Minimum:** ≥ 20.20.0
- **Deployment:** ✅ Vercel, Netlify, cPanel support ready

### Frontend Stack
- ✅ React 18 + Vite 5
- ✅ TypeScript with strict mode
- ✅ TanStack Query v5 for state management
- ✅ React Router v6 for routing
- ✅ TailwindCSS + shadcn/ui components
- ✅ React Hook Form for forms
- ✅ Zod for validation

### Backend (Supabase)
- ✅ PostgreSQL with Row-Level Security (RLS)
- ✅ Supabase Auth (email/password + OAuth)
- ✅ Supabase Storage (4 buckets configured)
- ✅ Supabase Edge Functions (7 functions deployed)
- ✅ ~162 database migrations applied
- ✅ Stored procedures and RPC functions

### Payment Integration
- ✅ eSewa gateway (Nepal)
- ✅ Cash on Delivery (COD)
- ✅ Invoice generation

---

## 🎯 Feature Areas & Status

### Public Features (User-Facing)
| Feature | Status | Notes |
|---------|--------|-------|
| Home Page | ✅ Complete | Dynamic content, AI-powered sections |
| Product Catalog | ✅ Complete | Search, filter, device specs |
| Shopping Cart | ✅ Complete | Persistent cart, quantity management |
| Checkout Flow | ✅ Complete | eSewa + COD payment options |
| Order Management | ✅ Complete | User can view order history, status tracking |
| Repair Service | ✅ Complete | Booking, tracking, store assignment |
| Device Valuation | ✅ Complete | Auto-calculated based on device/condition |
| Marketplace (Sell) | ✅ Complete | List devices, manage listings, receive inquiries |
| Store Directory | ✅ Complete | Browse stores, store detail pages, filters |
| User Dashboard | ✅ Complete | Profile, orders, listings, settings |
| Articles & Guides | ✅ Complete | AI-generated content, comments, polls |
| Newsletter | ✅ Complete | Subscription with rate limiting |

### Admin Panels (Staff/Super/Store)
| Panel | Routes | Status | Notes |
|------|--------|--------|-------|
| **Super Admin** | 19 routes | ✅ Complete | Platform analytics, user management, bulk operations |
| **Staff Admin** | 15+ routes | ✅ Complete | Permission-gated content/repair/store management |
| **Store Admin** | 12+ routes | ✅ Complete | Store-owned data, staff management, subscriptions |
| **Admin (Legacy)** | Redirects | ✅ Complete | Redirects to staffadmin for backward compatibility |

#### Super Admin Features
- Dashboard with analytics (revenue, products, orders, messages)
- User management and audit logs
- Content management (articles, guides, polls)
- Product and catalog management
- Repair request management
- Store approval and management
- Newsletter management
- Site settings and customization

#### Staff Admin Features
- Permission-gated module access
- Store management (CRUD, approval)
- Staff member management
- Product/catalog management (if permitted)
- Repair service management (if permitted)
- Content moderation (if permitted)
- Audit log viewing (if permitted)

#### Store Admin Features
- Store profile and settings
- Staff member management
- Product/inventory management
- Subscription and package management
- Order management
- Repair request management (if service available)
- Store credit and balance management

---

## 🗄️ Database Schema

**Main Tables:** 60+ tables organized by feature:
- Authentication: `profiles`, `user_roles`, `staff_admins`, `staff_permissions`
- Content: `articles`, `guides`, `comments`, `polls`, `content_pages`
- Products: `products`, `brands`, `catalog_products`, `device_catalog`, `valuation_rules`
- Commerce: `orders`, `order_items`, `sell_listings`, `marketplace_listings`
- Stores: `stores`, `store_pages`, `store_subscriptions`, `store_staff`
- Repairs: `repair_requests`, `repair_guides`, `repair_services`
- Admin: `staff_permissions`, `staffadmin_permissions`, `audit_logs`

**Storage Buckets:**
- `product-images` - Product photography
- `store-assets` - Store branding and media
- `repair-guide-images` - Repair documentation
- `user-avatars` - User profile pictures
- `article-images` - Content images

---

## 🔧 Edge Functions Deployed

| Function | Purpose | Status |
|----------|---------|--------|
| `create-payment-session` | eSewa payment gateway | ✅ |
| `verify-payment` | Payment verification callback | ✅ |
| `valuation-estimator` | Device valuation calculation | ✅ |
| `import-gadgetbyte-articles` | Content sync from GadgetByte | ✅ |
| `import-gadgetbyte-products` | Product catalog sync | ✅ |
| `newsletter-subscribe` | Newsletter subscription | ✅ |
| `sitemap` | Dynamic sitemap generation | ✅ |

---

## 🔐 Security

- ✅ Row-Level Security (RLS) on all tables
- ✅ Role-based access control (RBAC) via `user_roles` table
- ✅ Staff permission module/action checking
- ✅ Service role key protection (server-side only)
- ✅ CORS configuration
- ✅ Input validation with Zod
- ✅ Audit logging for sensitive operations
- ✅ Environment variables for secrets

---

## 📱 Responsive Design

- ✅ Mobile-first approach
- ✅ TailwindCSS breakpoints (sm, md, lg, xl, 2xl)
- ✅ shadcn/ui components tested on mobile
- ✅ Touch-friendly UI components
- ✅ Viewport meta tags configured

---

## 📊 Analytics & Monitoring

- ✅ Visitor tracking via Supabase functions
- ✅ Device search events logged
- ✅ Audit logs for admin operations
- ✅ User login history tracking
- ✅ Error boundary with fallback UI

---

## 🚀 Deployment Options

All three deployment paths are verified and ready:

1. **Vercel** (⭐ Recommended)
   - Automatic deployments on git push
   - Global CDN
   - Zero-config SPA routing (via `vercel.json`)
   - Setup time: 5-10 minutes

2. **Netlify**
   - GitHub integration
   - Automatic HTTPS
   - Redirect configuration via `netlify.toml`
   - Setup time: 10-15 minutes

3. **cPanel Node.js**
   - Traditional VPS/shared hosting
   - Run `npm start` to launch Node.js server (port 3000)
   - Requires nginx/Apache reverse proxy
   - Setup time: 30-45 minutes

**Deployment Checklist:**
- [ ] Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
- [ ] Set `VITE_ESEWA_ENABLED=true` if using eSewa
- [ ] Run `supabase db push` to apply all migrations
- [ ] Deploy edge functions: `supabase functions deploy <name>`
- [ ] Configure Supabase edge function secrets (eSewa keys, site URL, etc.)
- [ ] Verify storage buckets exist
- [ ] Test payment flow with test eSewa account

---

## 📝 Documentation Structure

| File | Purpose | Audience |
|------|---------|----------|
| `README.md` | Project overview & quick start | All developers |
| `DEPLOYMENT.md` | Full deployment guide | DevOps/Deployment engineers |
| `docs/AI_README.md` | AI agent orientation | AI developers/new contributors |
| `docs/AI_ARCHITECTURE.md` | App structure & routing | Developers implementing features |
| `docs/AI_BUILD_GUIDE.md` | Build commands & development patterns | Developers implementing features |
| `docs/AI_DATA_MODEL.md` | Database schema & Supabase client | Backend/data developers |
| `docs/AI_FUNCTION_INDEX.md` | Exported hooks/services/utilities | Frontend developers |
| `CHANGELOG.md` | Feature status & project summary | Project managers/QA |

---

## 🔄 Common Workflows

### Setting Up Local Development
```bash
npm install
cp .env.example .env  # Fill in Supabase credentials
npm run supabase:start
npm run dev
```

### Running Tests
```bash
npm test          # Run all tests once
npm run test:watch # Watch mode for development
```

### Building for Production
```bash
npm run build
npm run start  # or deploy to Vercel/Netlify
```

### Deploying Edge Functions
```bash
npm run supabase:functions  # Local dev mode
supabase functions deploy <function-name>  # Deploy to Supabase
```

### Resetting Database (Development Only)
```bash
npm run supabase:reset
```

---

## ⚠️ Known Limitations & TODOs

- **Analytics Bundle Size:** Large analytics chunk (438 kB) can be code-split for Core Web Vitals improvement
- **Lint Warnings:** 179 non-blocking warnings, mostly `any` types (low priority)
- **Store Applications:** Pending super admin review workflow (UI ready, approval flow TBD)
- **Payment:** eSewa test mode requires test account credentials
- **GadgetByte Sync:** Edge functions for content/product import require manual trigger or scheduled runs

---

## 🎓 For New Developers

1. **Start here:** [AI_README.md](docs/AI_README.md)
2. **Understand the architecture:** [AI_ARCHITECTURE.md](docs/AI_ARCHITECTURE.md)
3. **Learn build patterns:** [AI_BUILD_GUIDE.md](docs/AI_BUILD_GUIDE.md)
4. **Reference data model:** [AI_DATA_MODEL.md](docs/AI_DATA_MODEL.md)
5. **Find exported functions:** [AI_FUNCTION_INDEX.md](docs/AI_FUNCTION_INDEX.md)

---

## 📞 Support & Questions

- Check existing markdown docs before asking
- Search codebase with `rg` (ripgrep) for function names, table names, route paths
- Review hooks/services in `src/hooks/` and `src/services/`
- Check RLS policies in migrations for access control questions
- Review component patterns in existing code before adding new abstractions

---

**Last Validated:** May 13, 2026  
**Next Review:** May 20, 2026
