---
name: sell-valuation-flow
description: Use when modifying Tamrakar's sell-your-phone valuation flow, product-page valuation links, lead capture, or Supabase tables/RPCs related to sell_phone_leads and leads_quotes.
---

# Sell Valuation Flow

## Workflow

1. Read these files first:
   - `docs/AI_DATA_MODEL.md`
   - `docs/AI_FUNCTION_INDEX.md`
   - `src/pages/sell/SellYourPhone.tsx`
   - `src/services/sellPhoneService.ts`
   - latest matching migrations in `supabase/migrations/`
2. Treat `sell_phone_leads` and `leads_quotes` as compatibility-sensitive. Migrations have created different column sets over time.
3. Keep lead capture tolerant of missing columns, legacy not-null columns, and older condition checks until the deployed database is confirmed current.
4. Product detail pages should keep an internal link to `/sell-your-phone` with `brand` and `model` query params.
5. Validate with `npm run build`. If browser tooling is available, smoke-test:
   - `/sell-your-phone`
   - `/sell-your-phone?brand=Apple&model=iPhone%2015`
   - at least one `/product/:slug`

## Current Canonical Files

- Service: `src/services/sellPhoneService.ts`
- Flow page: `src/pages/sell/SellYourPhone.tsx`
- Product internal CTA: `src/pages/ProductDetail.tsx`
- Schema alignment migration: `supabase/migrations/20260504090000_repair_sell_phone_valuation_flow.sql`
