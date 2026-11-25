export interface CatalogProductLike {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  price: string;
  price_value: number | null;
  image?: string | null;
  description?: string | null;
  specs?: Record<string, unknown> | null;
  source_site?: string | null;
  in_stock?: boolean | null;
  created_at?: string;
  updated_at?: string;
  store_id?: string | null;
}

export function canonicalProductKey(product: Pick<CatalogProductLike, "brand" | "name" | "store_id">) {
  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
  return `${product.store_id || "platform"}|${normalize(product.brand || "")}|${normalize(product.name)}`;
}

export function parseNprPrice(value: string) {
  // Keep everyday Nepal formats, including "NPR 1,39,999" and "Rs. 1,000/-",
  // but do not turn "-500", "USD 500", "500abc" or "1e6" into valid prices.
  const withoutCurrency = value.trim().replace(/^(?:NPR|RS\.?|रु\.?|₨)\s*/i, "");
  const amount = withoutCurrency.replace(/\s*\/-\s*$/, "").trim();
  if (!/^\d[\d,]*(?:\.\d{1,2})?$/.test(amount)) {
    throw new Error("Enter a valid price greater than zero");
  }
  const numeric = Number(amount.replace(/,/g, ""));
  const rounded = Math.round(numeric);
  if (!Number.isFinite(numeric) || numeric <= 0 || !Number.isSafeInteger(rounded) || rounded <= 0) {
    throw new Error("Enter a valid price greater than zero");
  }
  return rounded;
}

export function formatNprPrice(value: number) {
  return `Rs. ${Math.round(value).toLocaleString("en-IN")}`;
}

function qualityScore(product: CatalogProductLike) {
  const baseSlug = product.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const source = product.source_site?.toLowerCase() || "";
  return (
    (source && !source.includes("mock") ? 100 : 0) +
    (product.slug === baseSlug ? 40 : 0) +
    (product.in_stock === true ? 20 : 0) +
    (product.description ? 8 : 0) +
    (product.specs && Object.keys(product.specs).length ? 8 : 0) +
    (product.image ? 4 : 0)
  );
}

export interface ProductDuplicateGroup<T extends CatalogProductLike> {
  key: string;
  primary: T;
  duplicates: T[];
  prices: number[];
  hasPriceConflict: boolean;
}

export function groupDuplicateProducts<T extends CatalogProductLike>(products: T[]) {
  const grouped = new Map<string, T[]>();
  for (const product of products) {
    const key = canonicalProductKey(product);
    grouped.set(key, [...(grouped.get(key) || []), product]);
  }

  return [...grouped.entries()].map(([key, rows]): ProductDuplicateGroup<T> => {
    const ranked = [...rows].sort((a, b) => {
      const score = qualityScore(b) - qualityScore(a);
      if (score) return score;
      return String(b.updated_at || b.created_at || "").localeCompare(String(a.updated_at || a.created_at || ""));
    });
    const prices = [...new Set(ranked.map((row) => Number(row.price_value || 0)).filter((price) => price > 0))].sort((a, b) => a - b);
    return { key, primary: ranked[0], duplicates: ranked.slice(1), prices, hasPriceConflict: prices.length > 1 };
  });
}
