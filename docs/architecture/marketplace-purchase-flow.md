# Marketplace purchase and fulfillment flow

## Decision

The public marketplace is a unified read model, but purchases retain an explicit inventory source:

- `products` — platform/catalog commerce inventory.
- `store_products` — inventory owned and fulfilled by a marketplace store.
- `sell_listings` — peer-to-peer inquiry listings; these do not enter platform checkout.

The cart stores `source_type` and the inventory identifier. The browser displays a convenient price, but `create-order-secure` reloads the authoritative row, validates status/store/stock, calculates totals, creates the order items, and reserves store inventory with a compare-and-set update.

## Flow

1. Public marketplace combines eligible store inventory and active private listings.
2. Every active store is discoverable in the marketplace store section.
3. Store-product detail pages expose **Add to cart** and **Buy now** when stock is available.
4. Private listings expose seller contact only.
5. Checkout requires authentication and sends identifiers and quantities, never trusted prices.
6. The Edge Function validates authoritative price, inventory, store ownership link, quantity limits, and rate limit.
7. One customer order may contain products from multiple stores.
8. `order_items.store_id` routes items to the correct store.
9. `store_order_fulfillments` creates one fulfillment record per store/order pair.
10. Store admins update only their own fulfillment record. Platform admins retain order-level payment and oversight.
11. Cancelled, failed, or refunded orders restore reserved `store_products` stock once using `orders.inventory_released_at`.
12. Verified online payments create commissions and payouts through the existing payment verification flow; COD becomes actionable immediately.

## Invariants

- Browser prices never determine order totals.
- A store product without an active status, positive stock, positive price, and store assignment cannot be purchased.
- Private-seller listings cannot be silently converted into platform orders.
- Store admins cannot advance another store's portion of a multi-store order.
- Inventory release is idempotent.
- Payment capture and fulfillment are separate states.

## Remaining provider dependency

Automatic eSewa checkout remains controlled by `VITE_ESEWA_ENABLED`. Production enablement requires valid merchant secrets and server-to-server verification. A browser success redirect must never mark an order paid.
