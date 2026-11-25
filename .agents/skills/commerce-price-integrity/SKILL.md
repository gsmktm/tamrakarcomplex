---
name: commerce-price-integrity
description: Protect Nepalese rupee prices, product/catalog identity, availability, seller inventory and checkout behavior. Use for product CRUD, imports, trade-in, price displays, stock and carts.
---

# Commerce and Price Integrity

Inspired by Matt Pocock's test-driven workflow, ECC verification and Addy Osmani's production quality practices. Project-specific constraints take priority.

## Core invariants

- Currency is NPR. Reject negative, non-finite, ambiguous and arbitrary-text prices. Display separators with `en-IN` while preserving numeric values for calculations.
- Do not equate official MRP, retailer list price, store offer, trade-in quote, repair estimate and final paid price.
- Never silently overwrite a verified price with an unverified scraped figure. Retain source URL, observed date, reviewer and conflict details where the schema supports them.
- A product without valid positive price and verified stock must not be purchasable; zero/unknown stock is never automatically 'available'.
- Preserve `store_id` and ownership restrictions on inventory edits; an admin UI check is not an RLS policy.
- Deduplicate only within the correct brand, model, variant and seller boundary. Avoid merging distinct storage/color/warranty variants.

## Workflow

1. Identify all affected paths: `src/lib/productCatalogNormalization.ts`, `src/lib/productPresentation.ts`, `src/services/priceListService.ts`, product forms, checkout and policies.
2. Test a single customer-observable rule first: malformed price blocked, unavailable item cannot checkout, or tenant A cannot edit tenant B.
3. Fix with minimum code and rerun the relevant test. Confirm no accidental changes to existing valid NPR input.
4. Verify price displays, API responses, stored values, audit events, mobile UX and rollback.
5. Never bulk-write prices or send real payments as part of a dry-run.
