# Tamrakar Complex · Commerce Experience V2

Branch: feat/commerce-command-hero-2026

## Product design decision

Tamrakar Complex is already a multi-service marketplace. Keep existing Supabase-backed
product, store, repair, valuation, checkout and RBAC flows. The public homepage is a
navigation and trust problem, not a reason to replace its application architecture.

### Design language
- Dark charcoal and deep teal canvas, Nepal marketplace identity anchored to New Road.
- Electric lime for primary calls to action; cobalt, amber and warm paper for distinct journeys.
- Syne display type and Manrope body type, inherited from the existing app.
- Strong contrast, consistent focus rings, 44px+ touch targets, reduced-motion support.
- Mobile-first command panel; four primary destinations, two searchable datasets.
- Avoid fake live counters, unverified ratings or promises about payment and repair timing.

### Verified integration contracts
- Product query: /cat/mobiles?tab=buy&q=...
- Pre-owned listings query: /marketplace?q=...
- Services: /repair
- Sell and exchange: /sell-your-phone
- Stores: /stores
- Complex floor/map navigation: /map
- Disclosures: /marketplace-disclosure

The command hero intentionally does not send q to /stores or /repair:
those pages have independent local search UIs and currently do not consume
the same URL parameter. This prevents an apparently functional search from silently
dropping a user's intent.

## Agent roles for subsequent implementation

1. **UX lead:** usability studies at 360px, 768px, and 1440px; no duplicated
   homepage hero; validate content and keyboard flows.
2. **Frontend engineer:** component isolation, routes, URL state, keyboard/focus
   accessibility, skeleton/error/empty states, measurable performance budget.
3. **Backend engineer:** investigate store-directory URL search and repair-model
   search deep linking; do not change Supabase tables/RLS as a visual-design shortcut.
4. **Security engineer:** protect admin boundaries, validate listings and payments
   server-side, review auth and rate limits, never expose service-role credentials.
5. **QA engineer:** npm run build, npm test, npm run check-routes,
   npm run lint, npm run chrome:check and mobile/keyboard inspection before merge.

## Acceptance checks
- Both search scopes submit the exact typed term and preserve URL encoding.
- Empty searches browse the selected catalog; no dead buttons.
- Hero and the existing product/repair/store sections remain responsive.
- All controls are focus-visible and screen-reader labeled.
- Existing home section configuration continues to govern hero visibility.
- All changes are isolated to UI and search routing; no Supabase migrations.
- Netlify preview and CI must be checked before merging the PR.
