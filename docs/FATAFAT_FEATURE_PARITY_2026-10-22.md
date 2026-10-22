# Fatafat Sewa public feature audit → Tamrakar Complex function roadmap

**Audit date:** 2026-10-22 (Asia/Kathmandu)  
**Source platform:** https://fatafatsewa.com/  
**Target repository:** https://github.com/gsmktm/tamrakarcomplex  
**Strategy:** Build independently, using Tamrakar Complex branding, its existing React + Vite + Supabase architecture, multi-store tenancy, and Nepal-specific operations. Do not copy proprietary code, product imagery, branding, financial partnership claims or customer data.

## Evidence and interpretation

The source site publicly exposes product/category shopping, search, product comparison, an EMI calculator, exchange listing, repair flow, buying guides, offers, FAQ/support, and payment/delivery descriptions. **Displayed or advertised capabilities are not proof of a functioning backend.** In particular, the 2026-10-22 public repair and exchange pages visibly say "Feature Under Development." The source About page claims multiple banking/payment partnerships and service guarantees, but those business relationships must not be attributed to Tamrakar Complex.

Public pages inspected:
- https://fatafatsewa.com/
- https://fatafatsewa.com/about-us
- https://fatafatsewa.com/emi
- https://fatafatsewa.com/exchangeProducts
- https://fatafatsewa.com/repair
- https://fatafatsewa.com/product-detail/samsung-galaxy-a17-5g-8gb-256gb-price-in-nepal

Repository review: `README.md`, `src/routes/publicRoutes.tsx`, `src/data/siteNavigation.ts`, `src/pages/ProductDetail.tsx`, `src/pages/admin/EmiPlanManager.tsx`, `src/hooks/useProducts.ts`, `src/hooks/usePaymentMethods.ts`, and the tracked source-file inventory. This is **source presence**, not evidence of a production deployment, operational payment rails, or passing CI.

## Functional comparison and status

| ID | Source feature / functional behavior | Tamrakar source status before this branch | Target action |
|---|---|---|---|
| C01 | Category browsing (phones, laptops, tablets, accessories, drones, audio) | Existing catalog, category pages and mobile master | Retain; unify category schema, store-specific stock and facets |
| C02 | Product search, filters, brand, sort | Existing search and product hooks | Retain; cross-store availability, search analytics and safe fallback |
| C03 | Product detail, variants, specifications, warranty, price | Existing PDP and mobile model pages | Retain; explicit store quote, inventory, verified warranty |
| C04 | Compare products | Existing `/compare` and compare store | Retain; compare total delivered price and warranty |
| C05 | Cart, wishlist, account, checkout | Existing source | Validate checkout edge cases, reservations and tenant permissions |
| F01 | Monthly EMI preview and calculator | Admin-only EMI calculator and PDP example; missing customer route | **Phase 1 implemented on feature branch:** `/emi` and `/emi-calculator`, validated finance calculations, PDP deep link |
| F02 | Bank/financier plan selection | `EmiPlanManager` and plan service exist | Publish only finance plans approved for public display, tied to store/product and effective dates |
| F03 | Financing application / eligibility / document collection | Not verified end-to-end | Consent, secure document handling, eligibility intake, lender review, application status |
| F04 | EMI wallet, disbursement and repayment tracking | Not verified | Separate regulated-lender integration; no direct lending without approvals |
| T01 | Mobile/laptop exchange and valuation | Existing sell/exchange routes, valuation hooks and store admin exchange manager | Enhance inspection, pickup SLA, quote expiry, pricing audit, data wiping |
| R01 | Repair booking, diagnosis, progress | Existing repair hub/wizard/tracking/admin | Enhance technician dispatch, parts inventory, before/after proof, customer acceptance |
| D01 | Shipping, nationwide fulfillment, order tracking | Checkout and order tracking components exist | Verify courier integration, COD reconciliation and reverse logistics |
| P01 | Nepali payments and bank transfer | Existing `usePaymentMethods`/provider registry; eSewa mentioned in docs | Verify eSewa/Khalti/ConnectIPS per merchant, server-side callbacks, idempotency |
| S01 | Warranty, return/refund and after-sales | Content routes and order/support foundations | Implement per-seller claim state machines, evidence, deadlines and refunds |
| M01 | Deals, countdown, promotions, banners | Existing HomeOffers and CampaignManager | Scheduled promotions, eligibility, stock limits, no misleading countdowns |
| A01 | Blog, reviews, guides, buyer education | Existing news/guides/reviews modules | Editorial moderation, author/source provenance and SEO |
| A02 | AI chat, support FAQ, helpdesk | Existing ChatWidget and ChatBotManager | Human escalation, permission-aware account lookup, grounded KB responses |
| V01 | Multi-vendor seller onboarding | Existing stores/admins/staff/directories; Tamrakar differentiator | Strengthen verified-store proofs, subscription entitlements, tenant-bound operations |
| L01 | Referral, points, loyalty, customer lifetime view | Existing profile components | Fraud limits, ledger accounting and redemption |
| I01 | Insurance / device protection | Not verified | Only display contracted and legally reviewed insurance products |
| O01 | Operations analytics, audit and roles | Existing multi-role panels and audit source | KPIs for conversions, EMI enquiries, returns, repair turnaround, payout exceptions |

Status terms: "existing" = visible in the GitHub source; **not** guaranteed functioning live. "Not verified" = no reliable evidence found in reviewed code, not proof of absence.

## Generated function contracts — implementation backlog

### Shopping and inventory
- `searchProducts({query,filters,sort,page})`: tenant-aware product/catalog search; return stock source and seller identities.
- `getProductOffers(productId)`: ranked verified-store offers; show warranty, final price, and available stock.
- `reserveInventory({storeId,sku,quantity,cartId,expiresAt})`: transactional hold to prevent double selling.
- `compareProducts(productIds)`: normalized specification and total-price comparison.

### EMI and responsible financing
- `calculateEmiQuote({productPrice,downPayment,annualInterestRate,months,processingFee})`: local, validated amortizing EMI estimate. **Implemented** as `src/lib/emiCalculator.ts`, with Vitest unit cases.
- `getPublicFinancingPlans({storeId,productId,asOf})`: plans verified against bank/finance contracts, offer validity and RLS visibility.
- `checkFinancingPreconditions({productId,price,customerConsent})`: preliminary eligibility criteria without asserting loan approval.
- `submitFinancingApplication({customerId,productId,lenderId,consent,documents})`: authenticated server-only submission; encrypted document storage with retention policy.
- `reviewFinancingApplication(applicationId,decision)`: authorized lender review; auditable state changes only.
- `getFinancingApplicationStatus(applicationId)`: authenticated applicant or authorized reviewer only.
- `reconcileLenderSettlement(reference)`: signed server-to-server reconciliation, never frontend-only confirmation.

### Exchange and repairs
- `quoteTradeIn({brand,model,storage,condition,issues})`: estimated, expiring quote with pricing rules.
- `submitTradeInRequest({quoteId,storeId,pickupPreference})`: customer-facing workflow and seller assignment.
- `inspectTradeIn({requestId,inspectorId,findings})`: final inspection with photo proof and consent; recalculate offer.
- `finalizeTradeIn({requestId,customerConsent})`: transactionally apply verified credit to an order.
- `createRepairTicket({device,issue,storeId,requestedPickup})`: ticket id, service estimate and scope.
- `assignRepairTechnician({ticketId,technicianId})`: scoped staff-only dispatch.
- `recordRepairMilestone({ticketId,status,cost,attachments})`: visible timeline, optional customer approval gate.
- `closeRepairTicket({ticketId,confirmation})`: evidence-based resolution, warranty terms and invoice.

### Checkout, delivery, refunds and support
- `createCheckoutQuote({cart,deliveryAddress,paymentMethod})`: server computes final totals and tax.
- `initiatePayment({orderId,provider})`: payment gateway only when enabled, with valid credentials and merchant authority.
- `verifyPaymentCallback({provider,payload,signature})`: server-only signed verification and idempotency.
- `createFulfillment({orderId,warehouseOrStore,courier})`: pickup/pack/shipped/delivered/returned stages.
- `trackCustomerOrder(orderId)`: customer ownership enforced, no guessable public PII exposure.
- `createReturnOrWarrantyClaim({orderId,itemId,reason,evidence})`: seller-specific policy and customer rights.
- `createSupportTicket({customerId,channel,message})`: agent escalation, SLA and consent-aware history.

### Content and seller operations
- `publishCampaign({storeId,products,validity,limits})`: eligibility rules and recorded redemption.
- `publishBuyerGuide({authorId,sources,content})`: moderation and factual review.
- `answerCatalogQuestion({userQuery,permissions})`: vetted inventory & policy-grounded response, no invented pricing.
- `getSellerOperationsDashboard(storeId)`: verified aggregated sales, fulfillment, repair and inventory metrics.

## Phase 1: scope of this branch

Changed/new files:
- `src/lib/emiCalculator.ts`: pure finance math, validation and deep links.
- `src/lib/emiCalculator.test.ts`: zero APR, amortization, full downpayment, bad inputs and URL formatting.
- `src/pages/EmiCalculator.tsx`: mobile-responsive, public quotation view. Search catalog, select a product, adjust NPR price, down payment, representative APR, fees and tenure.
- `src/routes/publicRoutes.tsx`: add `/emi` and `/emi-calculator` alias (repairs a previously dead PDP URL).
- `src/data/siteNavigation.ts`: Buy > EMI Calculator.
- `src/pages/ProductDetail.tsx`: carry product/price to EMI page, remove unconditional "No extra cost" statement.

**Exclusions:** No bank integrations, KYC, loan submission, loan approval, repayments, live customer/financial state changes, payment collection, database migration, deployment or financial-provider promises in this phase.

## Implementation order

**Phase 1 — Customer EMI estimation (this branch):** Check route, product deep link, input validation, 0% and non-zero APR quotes, finance disclaimers.

**Phase 2 — Offer/financier integration:** Establish real lender agreements; reconcile admin EMI plan data, effective dates, store/product selection, credit-eligibility rules, fees; design RLS policy and public read model. Unit tests and bank sandbox test.

**Phase 3 — Multi-store order/repair/exchange workflows:** Inventory reservations, valuation inspections, repair parts/workflow, signed payment gateway callbacks, delivery and refund reconciliation.

**Phase 4 — Growth and after-sales:** Promotions, verified reviews, loyalty/referral fraud controls, editorial content, support AI escalation, seller dashboard.

## Security and operational gates

1. All money totals, discounts, fee policies and inventory holds must be recalculated server-side at checkout; client values and URL prices are not authoritative.
2. Apply tenant/owner RBAC and Supabase RLS for customers, store admins, staff and super admins. Never trust editable user metadata for authorization.
3. Do not store government ID scans in public buckets or URLs. Use consent, limited access, encrypted storage, retention and deletion policies.
4. Finance approval and payments need the applicable licensed lender or gateway and signed webhooks. Do not represent an indicative EMI estimate as an approved plan.
5. Store offers and bank partner names must be verified before public launch. Do not assume advertised third-party provider partnerships belong to Tamrakar Complex.
6. Test duplicate payments, race conditions, lost callbacks, partial refunds, offline state, pickup disputes and stock exhaustion.
7. Use existing app validation checks: `npm run build`, `npm test`, `npm run lint`, `npm run check-routes`, `npm run check:migrations`; CI and staging smoke test required before merging.
8. Treat public-source functionality as observable behavior only. No proprietary copying or third-party customer data ingestion.

## Acceptance criteria

- A product with a listed NPR price opens `/emi` and populates the calculator.
- A zero-interest example of NPR 120,000 with NPR 24,000 down for 12 months yields NPR 8,000/month.
- Changing APR recalculates an amortizing loan; fee is included in total payable separately, not silently financed.
- Negative prices, excessive down payment and invalid tenure are rejected.
- Form accurately states that the estimate is not a loan offer or approval.
- No customer PII, bank credentials or migration exposed by this feature.
- CI and browser flows pass prior to merge or production deployment.

**Repository/publishing policy:** Feature branch and draft PR only. No direct main-branch mutation and no live deployment until validation.
