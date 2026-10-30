import { STORES } from "@/data/storeData";
import type { Product } from "@/hooks/useProducts";
import { slugify } from "@/lib/utils";
import type { SellListingRow } from "@/types/app";
import { PRODUCTS } from "@/utils/productData";
import type { StoreDirectoryItem } from "@/services/storeDirectoryService";

const CATEGORY_BY_BRAND: Record<string, string> = {
  Apple: "Smartphones",
  Samsung: "Smartphones",
  Xiaomi: "Smartphones",
  Poco: "Smartphones",
  POCO: "Smartphones",
  Honor: "Smartphones",
  Vivo: "Smartphones",
  Oppo: "Smartphones",
  OPPO: "Smartphones",
  Realme: "Smartphones",
  OnePlus: "Smartphones",
  Google: "Smartphones",
  Infinix: "Smartphones",
  Tecno: "Smartphones",
  Motorola: "Smartphones",
  ZTE: "Smartphones",
  Nokia: "Smartphones",
  Huawei: "Smartphones",
  Sony: "Smartphones",
  Nothing: "Smartphones",
  Asus: "Laptops",
  Lenovo: "Laptops",
  Dell: "Laptops",
};

const CATEGORY_ALIASES: Record<string, string[]> = {
  smartphones: ["smartphones", "smartphone", "mobile", "mobiles", "phones", "phone"],
  laptops: ["laptops", "laptop", "notebook", "notebooks", "macbook"],
  tablets: ["tablets", "tablet", "ipad", "ipads"],
  earbuds: ["earbuds", "earbud", "tws"],
  headphones: ["headphones", "headphone", "headset", "headsets"],
  smartwatches: ["smartwatches", "smartwatch", "watch", "watches", "wearable", "wearables"],
  monitors: ["monitors", "monitor", "display", "displays"],
  speakers: ["speakers", "speaker", "bluetooth speaker", "audio speaker"],
  "pc builds": ["pc builds", "pc build", "desktop", "desktops", "gaming pc", "gaming pcs"],
  gaming: ["gaming", "console", "consoles", "controller", "controllers"],
  drones: ["drones", "drone"],
};

function getCategoryAliases(category?: string) {
  const normalized = category?.trim().toLowerCase();
  if (!normalized || normalized === "all") return [];
  return CATEGORY_ALIASES[normalized] ?? [normalized];
}

function formatPrice(value?: number) {
  if (!value || value <= 0) return "Rs. Contact";
  return `Rs. ${value.toLocaleString("en-NP")}`;
}

export function getFallbackProducts(): Product[] {
  return PRODUCTS.map((item) => {
    const name = `${item.brand} ${item.model}`.trim();
    const slug = slugify(name) || `product-${item.id}`;
    return {
      id: `fallback-product-${item.id}`,
      name,
      slug,
      brand: item.brand,
      price: formatPrice(item.retail_npr),
      price_value: item.retail_npr ?? null,
      image: item.image,
      images: [item.image],
      rating: null,
      reviews_count: 0,
      category: CATEGORY_BY_BRAND[item.brand] || "Smartphones",
      specs: null,
      highlights: ["Reference price only", "Merchant stock and selling offer not confirmed"],
      description: `${name} reference catalog entry. This is not a verified merchant offer or stock confirmation.`,
      in_stock: false,
      featured: false,
      source_site: "local-fallback",
      // Reference catalog entries have no verified merchant listing timestamps.
    };
  });
}

export function queryFallbackProducts(options: {
  category?: string;
  search?: string;
  brand?: string;
  sort?: "created_at" | "price_value" | "name";
  order?: "asc" | "desc";
  page?: number;
  pageSize?: number;
  minPrice?: number;
  maxPrice?: number;
} = {}) {
  const page = Math.max(1, options.page || 1);
  const pageSize = Math.max(1, options.pageSize || 20);
  const search = options.search?.trim().toLowerCase();
  const category = options.category?.trim().toLowerCase();
  const brand = options.brand?.trim().toLowerCase();

  let list = getFallbackProducts();

  if (category && category !== "all") {
    const aliases = getCategoryAliases(category);
    list = list.filter((product) => {
      const productCategory = product.category.toLowerCase();
      return aliases.some((alias) => productCategory.includes(alias));
    });
  }

  if (brand && brand !== "all") {
    list = list.filter((product) => product.brand?.toLowerCase() === brand);
  }

  if (search) {
    list = list.filter((product) =>
      [product.name, product.brand, product.category, product.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search)
    );
  }

  if (options.minPrice !== undefined) {
    list = list.filter((product) => Number(product.price_value || 0) >= Number(options.minPrice));
  }

  if (options.maxPrice !== undefined) {
    list = list.filter((product) => Number(product.price_value || 0) <= Number(options.maxPrice));
  }

  const sort = options.sort || "created_at";
  const direction = options.order === "asc" ? 1 : -1;
  list = [...list].sort((a, b) => {
    if (sort === "price_value") return (Number(a.price_value || 0) - Number(b.price_value || 0)) * direction;
    if (sort === "name") return a.name.localeCompare(b.name) * direction;
    return String(a.created_at || "").localeCompare(String(b.created_at || "")) * direction;
  });

  const total = list.length;
  const from = (page - 1) * pageSize;
  return { items: list.slice(from, from + pageSize), total };
}

export function getFallbackBrands(category?: string) {
  return Array.from(new Set(queryFallbackProducts({ category, pageSize: PRODUCTS.length }).items.map((product) => product.brand).filter(Boolean) as string[]))
    .sort((a, b) => a.localeCompare(b));
}

export type FallbackStoreCard = {
  id: string;
  name: string;
  location: string;
  logo_url: string | null;
  is_verified: boolean;
  services: string[] | null;
  subscription_status: string | null;
};

const EXTRA_STORE_CARDS: FallbackStoreCard[] = [
  ["suryabinayak-mobile-and-it-solutions", "Suryabinayak Mobile And IT Solutions", "Bhaktapur"],
  ["mobile-world-capital-naxal", "Mobile World Capital Naxal", "Kathmandu"],
  ["mobile-world-capital-dillibazar", "Mobile World Capital Dillibazar", "Kathmandu"],
  ["s-k-mobile-hub", "S.K Mobile Hub", "Tamrakar Complex"],
  ["oliz-store", "Oliz Store", "Kathmandu"],
  ["apple-world-mobile-pvt-ltd", "Apple World Mobile Pvt.Ltd", "Kathmandu"],
  ["gadget-plus-stores-pokhara", "Gadget Plus Stores Pokhara", "Pokhara"],
  ["ngt-mobiles-narayangarh", "NGT Mobiles Narayangarh", "Narayangarh"],
].map(([id, name, location]) => ({
  id,
  name,
  location,
  logo_url: null,
  is_verified: true,
  services: ["Mobile Sales", "Accessories", "Exchange", "Repair"],
  subscription_status: "active",
}));

export function getFallbackStoreCards(limit = 12): FallbackStoreCard[] {
  const primary = STORES.map((store) => ({
    id: store.id,
    name: store.name,
    location: store.location,
    logo_url: store.logo_url ?? null,
    is_verified: Boolean(store.is_verified),
    services: store.services ?? null,
    subscription_status: store.subscription_status ?? "active",
  }));
  return [...primary, ...EXTRA_STORE_CARDS].slice(0, limit);
}

export function getFallbackMarketplaceListings(limit = 48): SellListingRow[] {
  const stores = STORES.length ? STORES : [];
  return PRODUCTS.slice(0, limit).map((product, index) => {
    const store = stores[index % Math.max(stores.length, 1)] as StoreDirectoryItem | undefined;
    const usedFactor = index % 5 === 0 ? 0.72 : index % 3 === 0 ? 0.82 : 0.92;
    const price = Math.max(5000, Math.round((product.retail_npr || 30_000) * usedFactor));
    const brand = product.brand;
    const model = product.model.replace(/\s*\([^)]*\)\s*$/, "");
    const condition = index % 5 === 0 ? "used" : index % 3 === 0 ? "like_new" : "new";
    return {
      id: `fallback-listing-${product.id}`,
      user_id: null,
      store_id: store?.id ?? null,
      title: `${product.brand} ${product.model}`,
      description: `Available through Tamrakar Complex marketplace fallback catalog.`,
      brand,
      model,
      category: "mobile",
      condition,
      price,
      images: [product.image],
      location: store?.location || "Tamrakar Complex, Kathmandu",
      status: "active",
      created_at: new Date(Date.now() - index * 3_600_000).toISOString(),
      updated_at: new Date().toISOString(),
    } as SellListingRow;
  });
}
