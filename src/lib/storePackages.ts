import type { Package } from "@/types/subscription";
import type { Store } from "@/types/store";

export type StorePackageSlug = "free" | "silver" | "gold" | "diamond";
export type PackageBlockReason = "feature_disabled" | "free_limit" | "package_limit" | "invalid_limit";

type StorePackageMeta = {
  slug: StorePackageSlug;
  displayName: string;
  shortName: string;
  tagline: string;
  audience: string;
  accentClassName: string;
  badgeClassName: string;
  buttonClassName: string;
  featuredLabel?: string;
};

export interface PackageEntitlements {
  basicStoreInfo: boolean;
  shopNo: boolean;
  floorLocation: boolean;
  phone: boolean;
  whatsapp: boolean;
  email: boolean;
  logo: boolean;
  coverImage: boolean;
  publicContact: boolean;
  contactAfterLogin: boolean;
  productListing: boolean;
  productLimit: number;
  accessoriesListing: boolean;
  accessoriesLimit: number;
  salesRequests: boolean;
  salesRequestLimit: number;
  buyRequests: boolean;
  buyRequestLimit: number;
  sellRequests: boolean;
  sellRequestLimit: number;
  exchangeRequests: boolean;
  exchangeRequestLimit: number;
  valuationRequests: boolean;
  valuationRequestLimit: number;
  repairService: boolean;
  repairRequestLimit: number;
  unlockingService: boolean;
  unlockingRequestLimit: number;
  marketplaceEnabled: boolean;
  featuredListing: boolean;
  basicTheme: boolean;
  premiumTheme: boolean;
  diamondTheme: boolean;
  colorEditing: boolean;
  layoutEditing: boolean;
  fullThemeEditing: boolean;
  customDesign: boolean;
  customDomain: boolean;
  analytics: boolean;
  fullAnalytics: boolean;
  bulkUpload: boolean;
  prioritySupport: boolean;
  leadPriority: boolean;
  multiBranch: boolean;
  staffManagement: boolean;
  adminLimit: number;
  staffLimit: number;
  branchLimit: number;
  promoSlotLimit: number;
  marketplaceCommission: number;
  autoApproveListings: boolean;
  verifiedBadge: boolean;
  homepageFeature: boolean;
  topPriorityPlacement: boolean;
}

export type PackageLimitKey =
  | "product"
  | "accessory"
  | "sales"
  | "buy"
  | "sell"
  | "exchange"
  | "valuation"
  | "repair"
  | "unlocking"
  | "admin"
  | "staff"
  | "branch"
  | "promo";

export const STORE_PACKAGE_META: Record<StorePackageSlug, StorePackageMeta> = {
  free: {
    slug: "free",
    displayName: "Free Package",
    shortName: "Free",
    tagline: "Free store registration with basic visibility.",
    audience: "Best for small shops starting with limited requests and listings.",
    accentClassName: "from-gray-100 via-gray-50 to-white border-gray-200",
    badgeClassName: "border-gray-300 text-gray-600 bg-gray-50",
    buttonClassName: "border-gray-200 text-gray-700 hover:bg-gray-50",
  },
  silver: {
    slug: "silver",
    displayName: "Silver Package",
    shortName: "Silver",
    tagline: "Paid normal store package with premium basics.",
    audience: "Best for active shops that need listings, requests, themes, and basic analytics.",
    accentClassName: "from-slate-100 via-zinc-50 to-white border-slate-300/70",
    badgeClassName: "border-slate-400/70 text-slate-700 bg-slate-50",
    buttonClassName: "border-slate-300 text-slate-800 hover:bg-slate-50",
  },
  gold: {
    slug: "gold",
    displayName: "Gold Package",
    shortName: "Gold",
    tagline: "Strong active shop package with boosts and bulk tools.",
    audience: "Best for stores scaling leads, inventory, staff, and marketing placement.",
    accentClassName: "from-amber-100 via-yellow-50 to-white border-amber-300/80",
    badgeClassName: "border-amber-400/80 text-amber-700 bg-amber-50",
    buttonClassName: "border-amber-300 text-amber-900 hover:bg-amber-50",
    featuredLabel: "Best Value",
  },
  diamond: {
    slug: "diamond",
    displayName: "Diamond Package",
    shortName: "Diamond",
    tagline: "Top flagship package with maximum limits and full theme control.",
    audience: "Best for flagship stores that need full analytics, custom domain, and priority placement.",
    accentClassName: "from-cyan-100 via-sky-50 to-white border-cyan-300/80",
    badgeClassName: "border-cyan-400/80 text-cyan-700 bg-cyan-50",
    buttonClassName: "border-cyan-300 text-cyan-900 hover:bg-cyan-50",
    featuredLabel: "Premium Tier",
  },
};

export const PACKAGE_ENTITLEMENTS: Record<StorePackageSlug, PackageEntitlements> = {
  free: {
    basicStoreInfo: true,
    shopNo: true,
    floorLocation: true,
    phone: false,
    whatsapp: false,
    email: false,
    logo: false,
    coverImage: false,
    publicContact: false,
    contactAfterLogin: false,
    productListing: true,
    productLimit: 10,
    accessoriesListing: true,
    accessoriesLimit: 5,
    salesRequests: true,
    salesRequestLimit: 5,
    buyRequests: true,
    buyRequestLimit: 5,
    sellRequests: true,
    sellRequestLimit: 5,
    exchangeRequests: true,
    exchangeRequestLimit: 3,
    valuationRequests: true,
    valuationRequestLimit: 3,
    repairService: true,
    repairRequestLimit: 3,
    unlockingService: false,
    unlockingRequestLimit: 0,
    marketplaceEnabled: false,
    featuredListing: false,
    basicTheme: true,
    premiumTheme: false,
    diamondTheme: false,
    colorEditing: false,
    layoutEditing: false,
    fullThemeEditing: false,
    customDesign: false,
    customDomain: false,
    analytics: false,
    fullAnalytics: false,
    bulkUpload: false,
    prioritySupport: false,
    leadPriority: false,
    multiBranch: false,
    staffManagement: false,
    adminLimit: 1,
    staffLimit: 0,
    branchLimit: 1,
    promoSlotLimit: 0,
    marketplaceCommission: 15,
    autoApproveListings: false,
    verifiedBadge: false,
    homepageFeature: false,
    topPriorityPlacement: false,
  },
  silver: {
    basicStoreInfo: true,
    shopNo: true,
    floorLocation: true,
    phone: false,
    whatsapp: false,
    email: true,
    logo: true,
    coverImage: false,
    publicContact: false,
    contactAfterLogin: true,
    productListing: true,
    productLimit: 100,
    accessoriesListing: true,
    accessoriesLimit: 50,
    salesRequests: true,
    salesRequestLimit: 50,
    buyRequests: true,
    buyRequestLimit: 50,
    sellRequests: true,
    sellRequestLimit: 50,
    exchangeRequests: true,
    exchangeRequestLimit: 25,
    valuationRequests: true,
    valuationRequestLimit: 50,
    repairService: true,
    repairRequestLimit: 30,
    unlockingService: true,
    unlockingRequestLimit: 20,
    marketplaceEnabled: true,
    featuredListing: false,
    basicTheme: true,
    premiumTheme: true,
    diamondTheme: false,
    colorEditing: true,
    layoutEditing: false,
    fullThemeEditing: false,
    customDesign: false,
    customDomain: false,
    analytics: true,
    fullAnalytics: false,
    bulkUpload: false,
    prioritySupport: false,
    leadPriority: false,
    multiBranch: false,
    staffManagement: true,
    adminLimit: 3,
    staffLimit: 2,
    branchLimit: 1,
    promoSlotLimit: 0,
    marketplaceCommission: 12,
    autoApproveListings: false,
    verifiedBadge: false,
    homepageFeature: false,
    topPriorityPlacement: false,
  },
  gold: {
    basicStoreInfo: true,
    shopNo: true,
    floorLocation: true,
    phone: true,
    whatsapp: true,
    email: true,
    logo: true,
    coverImage: true,
    publicContact: true,
    contactAfterLogin: true,
    productListing: true,
    productLimit: 1000,
    accessoriesListing: true,
    accessoriesLimit: 500,
    salesRequests: true,
    salesRequestLimit: 500,
    buyRequests: true,
    buyRequestLimit: 500,
    sellRequests: true,
    sellRequestLimit: 500,
    exchangeRequests: true,
    exchangeRequestLimit: 250,
    valuationRequests: true,
    valuationRequestLimit: 500,
    repairService: true,
    repairRequestLimit: 250,
    unlockingService: true,
    unlockingRequestLimit: 150,
    marketplaceEnabled: true,
    featuredListing: true,
    basicTheme: true,
    premiumTheme: true,
    diamondTheme: false,
    colorEditing: true,
    layoutEditing: true,
    fullThemeEditing: false,
    customDesign: true,
    customDomain: false,
    analytics: true,
    fullAnalytics: false,
    bulkUpload: true,
    prioritySupport: true,
    leadPriority: true,
    multiBranch: true,
    staffManagement: true,
    adminLimit: 8,
    staffLimit: 10,
    branchLimit: 3,
    promoSlotLimit: 2,
    marketplaceCommission: 10,
    autoApproveListings: false,
    verifiedBadge: true,
    homepageFeature: true,
    topPriorityPlacement: false,
  },
  diamond: {
    basicStoreInfo: true,
    shopNo: true,
    floorLocation: true,
    phone: true,
    whatsapp: true,
    email: true,
    logo: true,
    coverImage: true,
    publicContact: true,
    contactAfterLogin: true,
    productListing: true,
    productLimit: 100000,
    accessoriesListing: true,
    accessoriesLimit: 100000,
    salesRequests: true,
    salesRequestLimit: 100000,
    buyRequests: true,
    buyRequestLimit: 100000,
    sellRequests: true,
    sellRequestLimit: 100000,
    exchangeRequests: true,
    exchangeRequestLimit: 100000,
    valuationRequests: true,
    valuationRequestLimit: 100000,
    repairService: true,
    repairRequestLimit: 100000,
    unlockingService: true,
    unlockingRequestLimit: 100000,
    marketplaceEnabled: true,
    featuredListing: true,
    basicTheme: true,
    premiumTheme: true,
    diamondTheme: true,
    colorEditing: true,
    layoutEditing: true,
    fullThemeEditing: true,
    customDesign: true,
    customDomain: true,
    analytics: true,
    fullAnalytics: true,
    bulkUpload: true,
    prioritySupport: true,
    leadPriority: true,
    multiBranch: true,
    staffManagement: true,
    adminLimit: 20,
    staffLimit: 50,
    branchLimit: 10,
    promoSlotLimit: 5,
    marketplaceCommission: 8,
    autoApproveListings: true,
    verifiedBadge: true,
    homepageFeature: true,
    topPriorityPlacement: true,
  },
};

export const STORE_SUBSCRIPTION_PACKAGES: Package[] = [
  {
    id: "pkg_free",
    name: "Free Package",
    slug: "free",
    monthly_price: 0,
    yearly_price: 0,
    product_limit: PACKAGE_ENTITLEMENTS.free.productLimit,
    admin_limit: PACKAGE_ENTITLEMENTS.free.adminLimit,
    branch_limit: PACKAGE_ENTITLEMENTS.free.branchLimit,
    promo_slot_limit: PACKAGE_ENTITLEMENTS.free.promoSlotLimit,
    features_json: [
      "Free store registration",
      "Basic store profile",
      "Basic theme only",
      "Limited products, accessories, and requests",
      "No unlocking service, premium theme, featured boost, bulk upload, or custom domain",
    ],
    is_active: true,
    sort_order: 0,
  },
  {
    id: "pkg_silver",
    name: "Silver Package",
    slug: "silver",
    monthly_price: 4999,
    yearly_price: 39999,
    product_limit: PACKAGE_ENTITLEMENTS.silver.productLimit,
    admin_limit: PACKAGE_ENTITLEMENTS.silver.adminLimit,
    branch_limit: PACKAGE_ENTITLEMENTS.silver.branchLimit,
    promo_slot_limit: PACKAGE_ENTITLEMENTS.silver.promoSlotLimit,
    features_json: [
      "Everything in Free",
      "Premium theme access and color editing",
      "Product, sales, buy, sell, exchange, valuation, repair, accessories, and unlocking features",
      "Basic analytics",
      "Few staff accounts",
    ],
    is_active: true,
    sort_order: 1,
  },
  {
    id: "pkg_gold",
    name: "Gold Package",
    slug: "gold",
    monthly_price: 9999,
    yearly_price: 99999,
    product_limit: PACKAGE_ENTITLEMENTS.gold.productLimit,
    admin_limit: PACKAGE_ENTITLEMENTS.gold.adminLimit,
    branch_limit: PACKAGE_ENTITLEMENTS.gold.branchLimit,
    promo_slot_limit: PACKAGE_ENTITLEMENTS.gold.promoSlotLimit,
    features_json: [
      "Everything in Silver",
      "More products, accessories, and sales leads",
      "Premium theme templates with color and layout editing",
      "Featured store placement and homepage boost",
      "Better analytics, bulk upload, priority support",
    ],
    is_active: true,
    sort_order: 2,
  },
  {
    id: "pkg_diamond",
    name: "Diamond Package",
    slug: "diamond",
    monthly_price: 17999,
    yearly_price: 149000,
    product_limit: PACKAGE_ENTITLEMENTS.diamond.productLimit,
    admin_limit: PACKAGE_ENTITLEMENTS.diamond.adminLimit,
    branch_limit: PACKAGE_ENTITLEMENTS.diamond.branchLimit,
    promo_slot_limit: PACKAGE_ENTITLEMENTS.diamond.promoSlotLimit,
    features_json: [
      "Everything in Gold",
      "Diamond-level theme and full UI/UX editing",
      "Custom domain",
      "Maximum listings and leads",
      "Homepage boost, featured placement, full analytics, bulk upload, and priority support",
    ],
    is_active: true,
    sort_order: 3,
  },
];

export function isStorePackageSlug(value: string | null | undefined): value is StorePackageSlug {
  return value === "free" || value === "silver" || value === "gold" || value === "diamond";
}

export function normalizeStorePackageSlug(value: string | null | undefined): StorePackageSlug {
  const slug = String(value ?? "").trim().toLowerCase();
  return isStorePackageSlug(slug) ? slug : "free";
}

export function getStorePackageMeta(slug: string | null | undefined): StorePackageMeta {
  return STORE_PACKAGE_META[normalizeStorePackageSlug(slug)];
}

export function getPackageConfig(packageSlug: string | null | undefined): PackageEntitlements {
  return PACKAGE_ENTITLEMENTS[normalizeStorePackageSlug(packageSlug)];
}

export function getStoreEntitlements(packageSlug: string | null | undefined): PackageEntitlements {
  return getPackageConfig(packageSlug);
}

export function formatStorePackageName(slug: string | null | undefined, fallbackName?: string | null) {
  if (fallbackName?.trim()) {
    if (/store/i.test(fallbackName)) return fallbackName.trim();
    return `${fallbackName.trim()} Store`;
  }

  return getStorePackageMeta(slug).displayName;
}

export function canStoreListProducts(packageSlug: string | null | undefined): boolean {
  return getStoreEntitlements(packageSlug).productListing;
}

export function getStoreProductLimit(packageSlug: string | null | undefined): number {
  return getStoreEntitlements(packageSlug).productLimit;
}

export function canStoreHavePublicContact(packageSlug: string | null | undefined): boolean {
  return getStoreEntitlements(packageSlug).publicContact;
}

export function canStoreBeFeatured(packageSlug: string | null | undefined): boolean {
  const entitlements = getStoreEntitlements(packageSlug);
  return entitlements.verifiedBadge || entitlements.homepageFeature || entitlements.featuredListing;
}

export function getStoreMarketplaceCommission(packageSlug: string | null | undefined): number {
  return getStoreEntitlements(packageSlug).marketplaceCommission;
}

export function canStoreAutoApproveListings(packageSlug: string | null | undefined): boolean {
  return getStoreEntitlements(packageSlug).autoApproveListings;
}

export const STORE_SORT_ORDER: Record<StorePackageSlug, number> = {
  diamond: 4,
  gold: 3,
  silver: 2,
  free: 1,
};

export function getStoreSortOrder(packageSlug: string | null | undefined): number {
  return STORE_SORT_ORDER[normalizeStorePackageSlug(packageSlug)] || 0;
}

export function getPackageLimit(packageSlug: string | null | undefined, limit: PackageLimitKey): number {
  const e = getStoreEntitlements(packageSlug);
  const map: Record<PackageLimitKey, number> = {
    product: e.productLimit,
    accessory: e.accessoriesLimit,
    sales: e.salesRequestLimit,
    buy: e.buyRequestLimit,
    sell: e.sellRequestLimit,
    exchange: e.exchangeRequestLimit,
    valuation: e.valuationRequestLimit,
    repair: e.repairRequestLimit,
    unlocking: e.unlockingRequestLimit,
    admin: e.adminLimit,
    staff: e.staffLimit,
    branch: e.branchLimit,
    promo: e.promoSlotLimit,
  };
  return map[limit];
}

export function validateStoreAgainstPackage(store: Partial<Store>, packageSlug: string | null | undefined): { valid: boolean; violations: string[] } {
  const entitlements = getStoreEntitlements(packageSlug);
  const violations: string[] = [];

  if (store.phone && !entitlements.phone) violations.push("Phone number not allowed for this package");
  if (store.whatsapp && !entitlements.whatsapp) violations.push("WhatsApp not allowed for this package");
  if (store.logo_url && !entitlements.logo) violations.push("Logo not allowed for this package");
  if (store.cover_image_url && !entitlements.coverImage) violations.push("Cover image not allowed for this package");

  return { valid: violations.length === 0, violations };
}
