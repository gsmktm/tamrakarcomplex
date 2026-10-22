# Tamrakar Complex — Platform UX & Festival Campaign Architecture (22 Oct 2026)

## Objective

Build a consistent Nepal-first tech marketplace, with credible offers and fast product discovery rather than a cluttered generic discount site. This document separates the changes **implemented on the Git branch** from the recommended **future work**.

## Evidence and decisions

- **Nepal dates:** Kathmandu Metropolitan City's Kartik 2083 calendar lists Tihar observances on 8–11 November and Chhath on 15 November 2026: https://kathmandu.gov.np/en/calendar . The campaign date *range* is a commercial schedule, **not** an assertion that a festival begins or ends on those exact dates. Festival dates must be verified annually, and templates should be reviewed before publication.
- **Findability:** Baymard's homepage usability research emphasizes product category navigation, clearly visible search, and curated entry points: https://baymard.com/research-articles/ecommerce-navigation-best-practice . The homepage preserves all three.
- **Ad restraint:** Baymard advises against aggressive promotions and uncontrolled rotating carousels: https://baymard.com/research-articles/ecommerce-homepage-ux . Therefore campaigns use stationary, accessible cards, at most two per section and one on task-specific pages.
- **Database security:** Public Supabase tables require explicit RLS and scoped privileges: https://supabase.com/docs/guides/database/postgres/row-level-security . Keep admin control enforced by database policies, not only by frontend roles.

## Delivered in review branch

| Layer | Implemented |
| --- | --- |
| UX | Scoped navy/orange campaign banners, legible contrast, keyboard focus, responsive 2/1 grid, decorative images with empty alt text |
| Campaign placement | `home_hero`, `home_mid`, `home_footer`, `marketplace_top`, `category_top`, `store_directory`, `repair_top`, `product_inline` |
| Visitor rules | Approved/active date range only; no fabricated promotions on backend failure; safe internal CTA destination |
| Admin | Festival templates, edit/delete, enable/pause, preview, schedule, position, CTA, sponsorship indicator, status counts and filtering |
| Assets | Original Dashain, Tihar, Chhath and New Year vector festival artwork |
| Database | Staged SQL migration extending the existing `marketing_banners` table and fixing public start-date visibility in RLS |
| Tests | Unit coverage for URL/image validation and boundary conditions |
| Compatibility | Existing commerce, orders, users, payments and all existing routes preserved |

### Placement rationale

- Home after categories: first curated campaign when users already see what the store sells
- Home after product discovery: complementary seasonal message, not a replacement for product cards
- Home before footer: optional seasonal CTA, lower prominence
- Marketplace and category: single contextual promotion; preserve search/filter tasks
- Stores: single directory-related message, never fake store profiles
- Repairs: service-appropriate announcement, never an invented repair discount
- Product details: after content/reviews, not between price and checkout
- No checkout promotions, pop-up takeover, or auto-advancing carousel

### Editorial / commercial rules

- A festival image can announce an event, but **discount claims, giveaways, price comparisons, or inventory must be confirmed before enabling the campaign**.
- Templates are **drafts**, even when they contain suggested festival dates.
- "Sponsored" is displayed for paid advertising; other content is labelled "Promotion".
- Admin link destinations are site-relative, protecting visitors from unreviewed external redirects.
- Once an offer ends, it stops rendering even if its record remains active.
- The image URL must be HTTPS or a local asset path.
- No user or purchase data are stored by the campaign banner component.

## Data model and migration release gate

Existing `public.marketing_banners` keeps id, title, subtitle, image_url, link_url, button_text, placement, starts_at, ends_at, sort_order, is_active. Migration adds `festival_key`, `disclosure`, `is_sponsored`, more placement values, a schedule window check and a date-aware public SELECT RLS policy. Admin policy `public.is_admin()` is reused. No seeds are published.

**Migration required before rollout.** Public campaign queries that reference new columns return an empty section until the migration is applied, rather than breaking page navigation. Do not enable new campaigns before verified DB schema deployment. The connected Supabase project was unavailable during implementation, so the SQL migration has **not been executed** or tested against production.

## Next product UX priorities (not claimed as completed)

| Priority | Area | Next capability / acceptance |
| --- | --- | --- |
| P0 | CI + database | Green TS/lint/tests/build; apply migration in staging; verify RLS with anon, shopper and admin roles |
| P0 | Catalog data | Actual price, currency, availability, store ownership and stale-price labels; remove unsafe sample fallbacks everywhere |
| P0 | Checkout | Price revalidation, stock reservation, payment confirmation, order state machine and clear failure recovery |
| P0 | Campaign QA | Screenshot approval at 360, 768, 1024, 1440; date boundary test in Asia/Kathmandu |
| P1 | Store panel | Store-submitted offers awaiting moderation, scoped to owned stores and entitlement checks |
| P1 | Offer engine | Verified promotion terms, min-order rules, eligibility, usage caps and conflict resolution; server-side validation |
| P1 | Search | Suggestion relevance, typo tolerance, category/brand facets, results count, no-result recovery |
| P1 | Repair | Book → estimate → assignment → customer consent → repair updates → completion |
| P1 | Notifications | Opt-in messaging, no duplicate broadcasts, consent and unsubscribe |
| P1 | Analytics | Aggregated impression/click/conversion metrics **only through rate-limited server ingestion**, never unauthenticated raw table writes |
| P2 | Multilingual | Accessible English/Nepali labels, NPR and date formats, locale-safe Nepali calendar reference |
| P2 | Operations | Merchant attribution, ad invoicing, payout reconciliation and audit trails |
| P2 | Content CMS | Draft/review/publish state, version history, media constraints and SEO canonical rules |
| P2 | Performance | Optimize hero LCP, lazy images, image dimensions, route splitting, CLS and INP |
| P2 | Experimentation | Optional A/B tests under privacy-aware analytics with holdouts |

## Role-to-page experience matrix

| Role | Primary pages / UX goal |
| --- | --- |
| Guest | Homepage, categories, compare, prices, store directory, articles, repair discovery |
| Customer | Cart/checkout, orders, wishlist, repair and exchange tracking, contact preferences |
| Store admin | Own storefront, products, leads, bookings, staff tasks and approved promotion requests |
| Staff admin | Assigned store and customer support modules subject to per-module RBAC |
| Super admin | Product and store governance, marketing campaigns, pricing, audit, users, payments and system settings |

## QA checklist (must run before merge)

1. Type-check; lint; unit tests; route audit; migration safety; production build and Chrome smoke.
2. Admin reads all campaigns but anonymous visitors can read only active + within schedule.
3. An inactive, future, expired or invalid campaign is never rendered publicly.
4. Unsafe target URL (external / protocol-relative / javascript) rejected before saving.
5. Banner CTA visits the correct existing route, with keyboard, touch and screen reader support.
6. All sections remain readable at smallest phone size, without horizontal overflow or forced height.
7. Missing campaign images do not obscure text; the page works if campaign DB is unavailable.
8. Campaign edit/pause/delete invalidates the public cache.
9. Verify every published discount against merchant-supplied official offer terms.
10. Explicit approval required before merging PR or deploying to production.

## Tradeoffs / deferred

This change is a useful, end-to-end **campaign slice**, not a full rewrite of all admin, payment, commerce, repair, or store management modules. Campaign analytics, coupons, creative uploads, moderation pipeline, and merchant-owned ads need separate backend authorization, permissions, and testing; shipping fake controls before enforcement would be unsafe. Keep the current working commerce workflows and improve them incrementally.
