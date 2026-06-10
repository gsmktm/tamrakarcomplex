// Pure, dependency-free commerce logic shared by edge functions and unit tests.
// Keeping these server-authoritative rules in one tested place prevents the
// "trust the frontend total" class of bugs.

export type ResolvedProduct = {
  id: string;
  name: string;
  price_npr: number;
  store_id: string | null;
};

export type CheckoutItem = {
  product_id?: string;
  catalog_product_id?: string;
  quantity?: number;
  // client-supplied price/total are intentionally ignored
  price?: number;
  total?: number;
};

export type ValidatedLine = {
  product_id?: string;
  catalog_product_id?: string;
  store_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
};

/** Recompute a single line from the DB-resolved product. Never uses client price. */
export function computeLine(item: CheckoutItem, product: ResolvedProduct): ValidatedLine {
  const quantity = Math.max(1, Math.floor(Number(item.quantity ?? 1)));
  const unit_price = Number(product.price_npr);
  if (!Number.isFinite(unit_price) || unit_price <= 0) {
    throw new Error(`Invalid price for product ${product.name}`);
  }
  return {
    product_id: item.product_id,
    catalog_product_id: item.catalog_product_id,
    store_id: product.store_id ?? null,
    product_name: product.name,
    quantity,
    unit_price,
    total_price: unit_price * quantity,
  };
}

/** Server-authoritative order total — sum of DB-recomputed lines. */
export function computeOrderTotal(lines: ValidatedLine[]): number {
  return lines.reduce((sum, l) => sum + l.total_price, 0);
}

/** Reject any product (store path) without a store assignment so payout can route. */
export function assertStoreAssigned(product: ResolvedProduct, isStorePath: boolean): void {
  if (isStorePath && !product.store_id) {
    throw new Error(`Product ${product.name} is missing a store assignment`);
  }
}

/** Initial order status by method. COD is actionable immediately; online waits to pay. */
export function resolveInitialOrderStatus(paymentMethod: string): 'confirmed' | 'pending_payment' {
  return paymentMethod === 'cod' ? 'confirmed' : 'pending_payment';
}

/** Verify a payment callback amount matches the recorded order total exactly. */
export function assertAmountMatches(orderTotal: number, callbackAmount: unknown): void {
  if (Number(orderTotal) !== Number(callbackAmount)) {
    throw new Error('Payment amount mismatch');
  }
}

/** Idempotency guard: returns true if this payment was already settled. */
export function isAlreadyPaid(paymentStatus: string): boolean {
  return paymentStatus === 'paid';
}

export type CommissionRow = { store_id: string; gross_amount: number; commission_amount: number };
export type PayoutRow = { store_id: string; net_amount: number; commission_total: number };

/** Roll per-item commissions into one payout per store (mirrors create_order_payouts SQL). */
export function splitPayouts(commissions: CommissionRow[]): PayoutRow[] {
  const byStore = new Map<string, PayoutRow>();
  for (const c of commissions) {
    const net = Number(c.gross_amount) - Number(c.commission_amount);
    const cur = byStore.get(c.store_id) ?? { store_id: c.store_id, net_amount: 0, commission_total: 0 };
    cur.net_amount += net;
    cur.commission_total += Number(c.commission_amount);
    byStore.set(c.store_id, cur);
  }
  return [...byStore.values()];
}
