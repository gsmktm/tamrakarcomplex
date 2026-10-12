# Tamrakar Complex — Commerce, Route and Database Safety Repair

**Date:** 2026-10-12
**Delivery:** existing draft PR #3, branch `design/premium-storefront-v3-20261010`
**Scope:** verified source-code defects and no-database-write repairs. **Not** a full production certification.

## Corrected checkout and payment flow

### 1. Provider/order mismatch (critical)
- **Before:** `verify-payment` checked order owner but did not require `order.payment_method` to match the provider being verified. A registered demo provider could potentially settle the wrong-provider order.
- **After:** shared `assertMatchingPaymentMethod` guard runs before the already-paid shortcut and before gateway verification. Settlement UPDATE is additionally constrained by `payment_method`. `create-payment-session` also rejects switching an eSewa/Khalti order to COD.
- **Source:** `supabase/functions/_shared/paymentGuards.ts`, `verify-payment/index.ts`, `create-payment-session/index.ts`.

### 2. eSewa v2 callback broken (high)
- **Before:** success URL sends `orderId` with eSewa `transaction_uuid` and `total_amount`, but the verification edge handler preferred the nested object and required nonexistent `oid`/`amt`/`refId` fields.
- **After:** shared pure parser accepts both legacy and v2 field forms and rejects missing IDs/non-numeric amounts; server independently checks amount and gateway confirmation.
- **Tests:** `src/test/paymentGuards.test.ts`.

### 3. False-positive payment success (critical)
- **Before:** the frontend treated undefined/missing verification data as success because it checked only `verifyData?.success === false`. It could clear the cart without positive server confirmation.
- **After:** only exact `{ success: true }` confirms an online payment; network errors remain pending. A zero-row update in server payment/order settlement now checks the actual paid state instead of claiming success. COD requires a server-stored confirmed or later order state.
- **Source:** `src/lib/paymentVerification.ts`, `src/pages/OrderSuccess.tsx`, payment Edge Function.
- **Tests:** `src/test/paymentVerification.test.ts`.

### 4. COD confirmation and concurrency (high)
- **Before:** atomic SQL already creates COD orders as confirmed; the payment Edge Function attempted a redundant RLS-governed update that might match zero rows, reporting a failure on an already confirmed order.
- **After:** skip redundant update if status already confirmed; otherwise confirm using scoped order ID, user ID, payment method and pending payment status, checking affected rows.
- **Source:** `create-payment-session/index.ts`, `supabase/migrations/20260826090000_atomic_idempotent_checkout.sql`.

### 5. Duplicate submission, unsafe redirect and unavailable providers
- Checkout now guards against overlapping form submissions, requires HTTPS gateway redirects/form POST URLs, and displays payment-method loading/error/unavailable states.
- The payment-method registry is restricted to modes the checked-in atomic checkout RPC actually supports: COD/eSewa; Khalti appears as coming soon pending schema + sandbox verification. **This is a documented temporary compatibility gate**, not a permanent Khalti prohibition.
- Tests: `paymentRedirect.test.ts`, `checkoutProviderSupport.test.ts`.
- Tracker: [Issue #6](https://github.com/gsmktm/tamrakarcomplex/issues/6).

## Cart reliability

- Browser-stored carts are now schema-normalized instead of parsed blindly.
- Invalid quantities, NaN, malformed entries, duplicate IDs and excess item counts are guarded.
- Callback functions, especially `clearCart`, are stable across provider re-renders. This prevents unnecessary payment-effect replay when the cart changes.
- Maximum ten units per line and fifty distinct lines reflect checked-in atomic checkout limits; **the server is still responsible for price, stock and ownership checks**.
- Tests: `src/test/cartState.test.ts`.

## Route reliability

- Legacy store `/:slug` and brand/model redirects preserve query strings and URL fragments.
- Slug segments are encoded; missing parameters fall back to a directory instead of an indefinite redirect spinner.
- Tests: `src/test/legacyDetailRoutes.test.ts`.
- Existing catalog/filter and search tests remain in force.

## Database audit safety

- **Before:** `scripts/audit-schema-admin-routes.cjs` invoked many RPCs with service-role credentials merely to determine existence; some names are privileged mutations.
- **After:** it reads SQL migration definitions for a local declaration inventory. A remote RPC is explicitly **not** called, and script output no longer claims the whole live schema is valid. Search-vector check uses a read-only SELECT.
- **Important:** this tool does not replace authenticated, read-only SQL catalog inspection of the correct production database.

## Remaining blockers and deployment limitations

1. [Issue #4](https://github.com/gsmktm/tamrakarcomplex/issues/4): TypeScript schema/RPC drift — mandatory CI still red; correct Tamrakar Supabase project is unavailable through the connected Supabase account.
2. [Issue #5](https://github.com/gsmktm/tamrakarcomplex/issues/5): npm production dependency advisory findings — security audit still red.
3. [Issue #6](https://github.com/gsmktm/tamrakarcomplex/issues/6): Khalti provider contract extension and sandbox confirmation.
4. Full role-specific (user/store/staff/superadmin) E2E, actual payment callbacks, browser screenshots, migration history and live RLS tests remain unverified.
5. **Edge Function changes are committed only.** They do not affect deployed server code until a separate authorized deployment.

## Release decision
Do not merge or deploy solely because the Vite build/unit checks pass. Keep the PR in draft until mandatory TypeScript, security, migration verification, and payment sandbox tests are green.
