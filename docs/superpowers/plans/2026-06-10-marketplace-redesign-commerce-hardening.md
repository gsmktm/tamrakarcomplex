# Tamrakar Complex — Redesign + Commerce Hardening Implementation Plan

> **For agentic workers:** Execute task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Premium mobile-first redesign + harden buy→checkout→order→payment→payout commerce flow so money reaches the correct store owner with DB-validated totals, commission, and payout logic.

**Architecture:** React 18 + Vite + TS + Supabase (PostgREST + Edge Functions/Deno) + Tailwind/shadcn. Gold/amber premium theme already in `src/index.css` (oklch tokens `--primary`, `--gold`). Commerce flow already exists and is mostly secure; this plan closes gaps **additively** (no breaking enum renames).

**Tech Stack:** Tailwind tokens, shadcn/ui, lucide icons, Supabase JS v2, Deno edge functions, eSewa v2.

**Constraints:**
- Cannot apply migrations / deploy edge functions from here (MCP authed to wrong project). Author files; operator runs `supabase db push` + `supabase functions deploy`.
- DB changes **additive-only** (user decision): add new statuses alongside old, map in code, no destructive backfill.
- Never edit `dist/`.

---

## Current State (inspected 2026-06-10)

**Edge functions** (`supabase/functions/`): `create-order-secure`, `create-payment-session`, `verify-payment` already:
- validate price/stock/store_id from DB (never trust frontend totals) ✓
- rate-limit checkout ✓
- re-check order ownership + amount match + idempotency ✓
- call real eSewa v2 status API ✓
- run `create_order_commissions` RPC on paid ✓

**Status enums (current):**
- `orders.order_status`: `pending, confirmed, processing, shipped, delivered, completed, cancelled, refunded`
- `orders.payment_status`: `pending, paid, failed, refunded`
- `store_payouts.status`: `pending, processing, paid, failed, cancelled`

**Gaps vs spec:** status vocab drift; `store_id` nullable on `products` + null fallback in edge fn; no `packed` order state; no `payable`/`disputed` payout states; frontend not yet premium/mobile-first; no sticky bottom nav.

---

## Phase 1 — Frontend Redesign (no DB risk, ship incrementally)

### Task 1.1: Design tokens audit + glass card utility
**Files:** Modify `src/index.css`
- [ ] Add `.glass-card` utility (light: `bg-white/80 backdrop-blur border-border`, dark: `bg-card/70`) — per skill contrast rule (no `bg-white/10`).
- [ ] Confirm gold CTA token maps to `--primary`; add `--success` emerald token for prices.
- [ ] Verify `prefers-reduced-motion` block exists; add if missing.

### Task 1.2: Mobile sticky bottom navigation
**Files:** Create `src/components/layout/BottomNav.tsx`; modify `src/App.tsx` (render below routes, `md:hidden`)
- [ ] 5 items: Home, Buy, Sell, Stores, Account. 44px touch targets, 8px gap, active state = gold.
- [ ] Hide on `/checkout`, `/auth`, admin routes. `aria-current` on active.
- [ ] `pb-[env(safe-area-inset-bottom)]`; add `pb-16 md:pb-0` to page shell so content clears nav.

### Task 1.3: Product card redesign
**Files:** Modify `src/components/products/ProductCard.tsx`
- [ ] Glass card, gold hover border, emerald price, stable hover (no layout shift), `cursor-pointer`, alt text, stock badge (text+color).

### Task 1.4: Store card redesign
**Files:** Find/modify store card (in `src/pages/Stores.tsx` or component)
- [ ] Verified badge (shield SVG, not emoji), rating w/ star icon, glass, gold CTA "View Store".

### Task 1.5: Checkout redesign + a11y
**Files:** Modify `src/pages/Checkout.tsx` (311 lines)
- [ ] Sticky order summary on mobile; gold "Place Order" CTA; `loading-buttons` (disable during async); `role="alert"` on errors; labels on all inputs; COD vs online toggle clear.

### Task 1.6: Homepage hero + fast search
**Files:** Modify hero/search components
- [ ] Keep existing gold hero; ensure search input ≥16px font (no iOS zoom), debounced, keyboard `/` focus.

**Verify Phase 1:** `npx tsc --noEmit` clean; browser check at 375/768/1440; build OK; SEO routes intact.

---

## Phase 2 — Commerce Hardening (additive DB + edge)

### Task 2.1: Additive status migration
**Files:** Create `supabase/migrations/20260610120000_commerce_status_additive.sql`
- [ ] Drop+recreate `order_status` CHECK to **superset**: add `pending_payment, paid, packed` to existing set (keep old values valid).
- [ ] Drop+recreate `store_payouts.status` CHECK to add `payable, disputed`.
- [ ] Backfill non-destructive: `UPDATE orders SET order_status='pending_payment' WHERE order_status='pending' AND payment_status='pending'` (safe, reversible note in comment).
- [ ] Add `idx` already exist — no-op.

### Task 2.2: store_id mandatory for sellable products
**Files:** same migration
- [ ] `UPDATE products SET store_id = <default_platform_store> WHERE store_id IS NULL` (create/lookup platform house store first).
- [ ] `ALTER TABLE products ALTER COLUMN store_id SET NOT NULL` (only after backfill; guard with DO block if nulls remain → skip + RAISE NOTICE).

### Task 2.3: Edge fn — enforce store_id + set pending_payment
**Files:** Modify `supabase/functions/create-order-secure/index.ts`
- [ ] Reject item if resolved `store_id` is null (throw `Product missing store assignment`).
- [ ] Set `order_status: 'pending_payment'` on insert for online methods; `'confirmed'` only for COD.
- [ ] Group items by store_id into per-store subtotals in response (prep for split payout).

### Task 2.4: Commission/payout on paid
**Files:** Modify `supabase/functions/verify-payment/index.ts`; verify `create_order_commissions` RPC
- [ ] On verified: `order_status='paid'` (not `confirmed`), `payment_status='paid'`.
- [ ] Ensure RPC writes `order_commissions` per store + creates `store_payouts` row status `pending`.
- [ ] Add transition: when order `delivered` → payout `payable`.

### Task 2.5: RLS review
**Files:** Create `supabase/migrations/20260610120100_commerce_rls_review.sql`
- [ ] Store admin can SELECT/UPDATE only own-store `orders`/`order_items` (via store_id ∈ their stores).
- [ ] Users SELECT only own orders. Payouts visible only to owning store + suadmin.

**Verify Phase 2:** operator runs `supabase db push` + `functions deploy`; smoke test order→pay→payout.

---

## Phase 3 — Tests

### Task 3.1: Checkout + tampering
**Files:** Create `supabase/functions/tests/checkout.test.ts` (Deno) or `src/__tests__/checkout.spec.ts`
- [ ] Frontend sends inflated total → server recomputes from DB, ignores client total.
- [ ] Out-of-stock item → rejected.
- [ ] Missing store_id product → rejected.

### Task 3.2: Payment tampering
- [ ] amount mismatch → `Payment amount mismatch`.
- [ ] replay (already paid) → idempotent success, no double commission.
- [ ] wrong user's order → `Order not found`.

### Task 3.3: RLS + roles
- [ ] store admin A cannot read store B orders.
- [ ] normal user cannot read others' orders/payouts.

### Task 3.4: Payout
- [ ] commission math: total − commission = store net; payout row created status pending; delivered→payable.

---

## Deliverables checklist
- [ ] Route/data flow notes (this doc, Current State section)
- [ ] DB migration + RLS (Phase 2)
- [ ] Edge function fixes (Phase 2)
- [ ] Frontend redesign components (Phase 1)
- [ ] Tests (Phase 3)
- [ ] PR summary with changed files (final)
