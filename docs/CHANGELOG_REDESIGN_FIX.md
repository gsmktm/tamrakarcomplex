# Changelog — Redesign & Fix Pass

All notable changes to TamrakarComplex.com.

---

## [2026-05-21] — Production Audit & Homepage Polish

### Security
- **Removed** `console.info("Auth: get_my_roles RPC result:", ...)` from `useAuth.tsx` — prevented role data leaking to browser devtools in production
- **Removed** `console.info("Auth: Normalized roles from RPC:", ...)` from `useAuth.tsx`
- **Removed** `console.info("Dashboard: RPC function successful")` from `SuperAdminDashboard.tsx`

### Bug Fixes
- **Fixed** `ProfileOverview.tsx` — `total_orders`, `total_repairs`, `total_listings` were hardcoded as `0`. Now fetched live from `orders`, `repair_requests`, `sell_listings` tables using parallel `Promise.all` with `count: exact`.

### Design System
- **Fixed** `HomeStoreSpotlight.tsx` — replaced rounded-[2.5rem] / rounded-[2rem] cards with design-system border layout (gap-px grid). Aligns with `--radius: 0.25rem` sharp-corner token.
- **Fixed** `HomeMarketplaceFeed.tsx` — replaced rounded-3xl / rounded-[2rem] cards. Same grid border approach.
- **Added** scroll reveal (`Reveal` IntersectionObserver component) to `HomeStoreSpotlight` — staggered per card.
- **Added** scroll reveal to `HomeMarketplaceFeed` — staggered per listing card.
- **Improved** `HomeStoreSpotlight` section header — newspaper-style flush layout matching rest of homepage.
- **Improved** `HomeMarketplaceFeed` header — removed `rounded-full` badge, replaced with sharp border label.
- **Updated** Store spotlight CTA banner — foreground/dark background with diagonal pattern overlay, sharp corners. Removed `rounded-[3rem]`.
- **Updated** Store cards — image thumbnails use square aspect ratio with `loading="lazy"`. Bottom accent rule animates on hover.
- **Improved** Marketplace cards — image reveal on hover uses `scale-105` not `scale-110` (more subtle).

### Config
- **Updated** `.env.example` — eSewa redirect URLs changed from `localhost:8080` to `tamrakarcomplex.com` production URLs.

### Docs
- **Created** `docs/FULL_PROJECT_AUDIT.md` — complete audit of frontend, backend, DB, routes, security, performance.
- **Created** `docs/DEPLOYMENT_READY_CHECKLIST.md` — step-by-step checklist for Vercel/Netlify/cPanel deployment.
- **Created** `docs/CHANGELOG_REDESIGN_FIX.md` (this file).

---

## [2026-05-20] — Homepage Redesign (prior session)

### Hero Section
- **Redesigned** `HeroSection` in `EcommerceHomeSection.tsx` — 2-column split layout (content left, stat grid right).
- **Added** massive Syne Black headline: "Buy. Sell." (foreground) + "Repair. Repeat." (saffron primary).
- **Added** inline search form in hero (avoids cluttered HomeSearchBox).
- **Added** 4 CTA buttons: Browse Phones, Sell Phone, Book Repair, Price List.
- **Added** hero service stat grid: 500+ Products / 250+ Verified Stores / 100K+ Transactions / 7 Services.
- **Added** mobile 4-col stat strip below hero content.
- **Removed** gradient text (`bg-clip-text text-transparent`) — replaced with solid `text-primary`.
- **Removed** `BannerSlider` from homepage.

### Scroll Animation System
- **Created** `src/components/home/Reveal.tsx` — IntersectionObserver scroll reveal wrapper. No Framer Motion dependency.
- **Added** CSS to `src/index.css`: `.reveal`, `.reveal-visible`, `.reveal-delay-1` through `.reveal-delay-5`.
- **Added** `prefers-reduced-motion` support — animations disabled for accessibility.
- **Applied** Reveal to `HomeTrustStats` — 4 stat cells stagger in on scroll.

### ServiceMatrix
- **Redesigned** — 6 flat sharp-corner cards, `xl:grid-cols-6`.
- **Removed** gradient backgrounds on cards.
- **Added** hover bottom-sweep accent line per card.

### SellCtaBanner
- **Removed** `rounded-3xl` → sharp rectangle.
- **Changed** CTA buttons from `rounded-full` to `rounded-sm`.

### Design Token Fixes
- **Fixed** `src/styles/dynamic-theme.css` — removed stale `:root { --primary: #8b5cf6 }` override.
- **Fixed** `src/lib/siteSettings.ts` — set `primaryColor: ""` to prevent hex injection over OKLCH vars.
- **Fixed** `.claude/launch.json` — port changed from 8080 to 5173.

---

## [2026-05-12] — Sell Flow Fix (pre-audit history)

### Sell Your Phone
- Fixed routing: `/sell-your-phone` properly connected to `SellYourPhone.tsx`.
- Fixed DB submit: sell listings now save to `sell_listings` table.
- Added `store_id` field to `sell_listings` (migration `20260425120700`).
- Sell lead notifications to stores via `20260504123000_sell_lead_store_notifications.sql`.

---

## [2026-05-08] — Super Admin Hardening

- Fixed super admin stats RPC (`get_super_admin_stats`).
- Fixed user list function — returns profiles with roles.
- Fixed admin user list showing 0 users.

---

## [2026-05-07] — Marketplace & Notifications

- Unified marketplace view with seller info.
- Lead assignment notifications.
- Referral reward triggers.
- Unlock request notifications.

---

## [2026-05-06] — Full Stack Reform

- Schema normalization v2.
- Store operating system tables.
- Automatic notification triggers.
- Commerce enhancements (discount pricing, variants).
- Marketing banners table.

---

## Earlier History

See `supabase/migrations/` directory — 200+ migrations from 2024-05-23 through 2026-05-21 covering the complete platform build.
