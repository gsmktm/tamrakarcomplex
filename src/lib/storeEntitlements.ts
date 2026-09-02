import {
  getPackageConfig,
  getPackageLimit,
  normalizeStorePackageSlug,
  type PackageBlockReason,
  type PackageEntitlements,
  type PackageLimitKey,
  type StorePackageSlug,
} from "./storePackages";
import { allowedStoreThemes } from "./storeThemeBuilder";

export type FeatureAccessResult = {
  allowed: boolean;
  reason?: PackageBlockReason;
  limit?: number;
  currentUsage?: number;
  packageSlug: StorePackageSlug;
};

export type PackageWithYearly = {
  packageSlug: StorePackageSlug;
  isYearly: boolean;
};

export type StoreEntitlements = {
  canShowStoreName: boolean;
  canShowShopNumber: boolean;
  canShowFloorLocation: boolean;
  canShowPhonePublic: boolean;
  canShowPhoneLoginRequired: boolean;
  canShowWhatsAppPublic: boolean;
  canShowWhatsAppLoginRequired: boolean;
  canShowEmailPublic: boolean;
  canShowEmailLoginRequired: boolean;
  productListingLimit: number;
  canListProducts: boolean;
  accessoryListingLimit: number;
  canListAccessories: boolean;
  canUseSalesRequests: boolean;
  salesRequestLimit: number;
  canUseBuyRequests: boolean;
  buyRequestLimit: number;
  canUseSellRequests: boolean;
  sellRequestLimit: number;
  canUseExchangeRequests: boolean;
  exchangeRequestLimit: number;
  canUseValuationRequests: boolean;
  valuationRequestLimit: number;
  canListRepairServices: boolean;
  repairServiceLimit: number;
  repairRequestLimit: number;
  canUseUnlockingServices: boolean;
  unlockingRequestLimit: number;
  canHaveVerifiedBadge: boolean;
  canRequestVerification: boolean;
  canBeFeatured: boolean;
  canAccessFeaturedSection: boolean;
  featurePlacementPriority: number;
  canEnableMarketplace: boolean;
  defaultMarketplaceCommission: number;
  availableThemes: string[];
  canUseBasicTheme: boolean;
  canUsePremiumTheme: boolean;
  canUseDiamondTheme: boolean;
  canEditThemeColors: boolean;
  canEditThemeLayout: boolean;
  canCustomizeDesign: boolean;
  canUseCustomDomain: boolean;
  adminUserLimit: number;
  staffMemberLimit: number;
  branchLimit: number;
  canAccessAnalytics: boolean;
  canAccessFullAnalytics: boolean;
  canAccessLeadManagement: boolean;
  leadPriority: number;
  promoBannerSlots: number;
  canCustomizeBanner: boolean;
  canManageMultipleBranches: boolean;
  canEnableTeamAccess: boolean;
  canUseBulkUpload: boolean;
  canAccessPrioritySupport: boolean;
  sellPhoneLeadAccess: "none" | "standard" | "priority";
  repairLeadAccess: "none" | "standard" | "priority";
};

function hasActiveSubscription(subscriptionStatus?: string | null, subscriptionEndDate?: string | null): boolean {
  if (String(subscriptionStatus ?? "").toLowerCase() !== "active") return false;
  if (!subscriptionEndDate) return true;
  const end = new Date(subscriptionEndDate);
  if (Number.isNaN(end.getTime())) return true;
  return end.getTime() > Date.now();
}

export function resolveEffectiveStorePackage(input: {
  package_slug?: string | null;
  subscription_status?: string | null;
  subscription_end_date?: string | null;
}): StorePackageSlug {
  const packageSlug = normalizeStorePackageSlug(input.package_slug);
  if (packageSlug === "free") return "free";
  return hasActiveSubscription(input.subscription_status, input.subscription_end_date) ? packageSlug : "free";
}

/**
 * Enhanced resolution that includes yearly billing cycle flag.
 * Used for featured placement logic (yearly subscriptions unlock featured regardless of tier).
 */
export function resolveEffectiveStorePackageWithYearly(input: {
  package_slug?: string | null;
  subscription_status?: string | null;
  subscription_end_date?: string | null;
  billing_cycle?: string | null;
}): PackageWithYearly {
  const packageSlug = resolveEffectiveStorePackage(input);
  const isYearly = (input.billing_cycle ?? "").toLowerCase() === "yearly";
  return { packageSlug, isYearly };
}

/**
 * Check if store can be featured this cycle.
 * Yearly subscriptions can be featured regardless of package tier.
 * Non-yearly: only silver/gold/diamond packages can be featured.
 */
export function canBeFeaturedThisCycle(input: {
  packageSlug: StorePackageSlug;
  isYearly: boolean;
  subscriptionStatus?: string | null;
  subscriptionEndDate?: string | null;
}): boolean {
  // Cannot be featured on free package unless yearly
  if (input.packageSlug === "free" && !input.isYearly) return false;
  
  // Yearly subscriptions can always be featured (unlocks featured for all tiers)
  if (input.isYearly) return true;
  
  // Non-yearly: only silver/gold/diamond can be featured
  return input.packageSlug !== "free";
}

export function buildEntitlements(packageSlug: string | null | undefined): StoreEntitlements {
  const slug = normalizeStorePackageSlug(packageSlug);
  const e = getPackageConfig(slug);
  const leadAccess = slug === "diamond" ? "priority" : slug === "gold" || slug === "silver" ? "standard" : "none";

  return {
    canShowStoreName: e.basicStoreInfo,
    canShowShopNumber: e.shopNo,
    canShowFloorLocation: e.floorLocation,
    canShowPhonePublic: e.publicContact && e.phone,
    canShowPhoneLoginRequired: e.contactAfterLogin && e.phone,
    canShowWhatsAppPublic: e.publicContact && e.whatsapp,
    canShowWhatsAppLoginRequired: e.contactAfterLogin && e.whatsapp,
    canShowEmailPublic: e.publicContact && e.email,
    canShowEmailLoginRequired: e.contactAfterLogin && e.email,
    productListingLimit: e.productLimit,
    canListProducts: e.productListing,
    accessoryListingLimit: e.accessoriesLimit,
    canListAccessories: e.accessoriesListing,
    canUseSalesRequests: e.salesRequests,
    salesRequestLimit: e.salesRequestLimit,
    canUseBuyRequests: e.buyRequests,
    buyRequestLimit: e.buyRequestLimit,
    canUseSellRequests: e.sellRequests,
    sellRequestLimit: e.sellRequestLimit,
    canUseExchangeRequests: e.exchangeRequests,
    exchangeRequestLimit: e.exchangeRequestLimit,
    canUseValuationRequests: e.valuationRequests,
    valuationRequestLimit: e.valuationRequestLimit,
    canListRepairServices: e.repairService,
    repairServiceLimit: e.repairRequestLimit,
    repairRequestLimit: e.repairRequestLimit,
    canUseUnlockingServices: e.unlockingService,
    unlockingRequestLimit: e.unlockingRequestLimit,
    canHaveVerifiedBadge: e.verifiedBadge,
    canRequestVerification: slug !== "free",
    canBeFeatured: e.featuredListing,
    canAccessFeaturedSection: e.homepageFeature || e.featuredListing,
    featurePlacementPriority: slug === "diamond" ? 1 : slug === "gold" ? 2 : slug === "silver" ? 3 : 4,
    canEnableMarketplace: e.marketplaceEnabled,
    defaultMarketplaceCommission: e.marketplaceCommission,
    availableThemes: allowedStoreThemes(slug).map((theme) => theme.slug),
    canUseBasicTheme: e.basicTheme,
    canUsePremiumTheme: e.premiumTheme,
    canUseDiamondTheme: e.diamondTheme,
    canEditThemeColors: e.colorEditing,
    canEditThemeLayout: e.layoutEditing,
    canCustomizeDesign: e.customDesign || e.fullThemeEditing,
    canUseCustomDomain: e.customDomain,
    adminUserLimit: e.adminLimit,
    staffMemberLimit: e.staffLimit,
    branchLimit: e.branchLimit,
    canAccessAnalytics: e.analytics,
    canAccessFullAnalytics: e.fullAnalytics,
    canAccessLeadManagement: e.salesRequests || e.buyRequests || e.sellRequests || e.exchangeRequests || e.valuationRequests || e.repairService,
    leadPriority: slug === "diamond" ? 1 : slug === "gold" ? 2 : slug === "silver" ? 3 : 4,
    promoBannerSlots: e.promoSlotLimit,
    canCustomizeBanner: e.homepageFeature,
    canManageMultipleBranches: e.multiBranch,
    canEnableTeamAccess: e.staffManagement,
    canUseBulkUpload: e.bulkUpload,
    canAccessPrioritySupport: e.prioritySupport,
    sellPhoneLeadAccess: leadAccess,
    repairLeadAccess: e.repairService ? leadAccess : "none",
  };
}

export function getStoreEntitlements(packageSlug: string | null | undefined): StoreEntitlements {
  return buildEntitlements(packageSlug);
}

export function getRawPackageEntitlements(packageSlug: string | null | undefined): PackageEntitlements {
  return getPackageConfig(packageSlug);
}

const FEATURE_MAP: Record<string, keyof PackageEntitlements> = {
  products: "productListing",
  product: "productListing",
  phone: "phone",
  whatsapp: "whatsapp",
  email: "email",
  logo: "logo",
  cover: "coverImage",
  accessories: "accessoriesListing",
  accessory: "accessoriesListing",
  sales: "salesRequests",
  buy: "buyRequests",
  sell: "sellRequests",
  exchange: "exchangeRequests",
  valuation: "valuationRequests",
  repair: "repairService",
  repairs: "repairService",
  unlocking: "unlockingService",
  software: "unlockingService",
  marketplace: "marketplaceEnabled",
  featured: "featuredListing",
  homepage_boost: "homepageFeature",
  analytics: "analytics",
  full_analytics: "fullAnalytics",
  bulk_upload: "bulkUpload",
  custom_domain: "customDomain",
  premium_theme: "premiumTheme",
  diamond_theme: "diamondTheme",
  theme_colors: "colorEditing",
  theme_layout: "layoutEditing",
  theme_full_editing: "fullThemeEditing",
  admin: "basicStoreInfo",
  staff: "staffManagement",
  branch: "basicStoreInfo",
  team: "staffManagement",
  branches: "multiBranch",
  promo: "homepageFeature",
};

const LIMIT_MAP: Partial<Record<string, PackageLimitKey>> = {
  products: "product",
  product: "product",
  accessories: "accessory",
  accessory: "accessory",
  sales: "sales",
  buy: "buy",
  sell: "sell",
  exchange: "exchange",
  valuation: "valuation",
  repair: "repair",
  repairs: "repair",
  unlocking: "unlocking",
  software: "unlocking",
  admin: "admin",
  staff: "staff",
  branch: "branch",
  branches: "branch",
  promo: "promo",
};

export function checkFeatureAccess(packageSlug: string | null | undefined, feature: string): FeatureAccessResult {
  const slug = normalizeStorePackageSlug(packageSlug);
  const e = getPackageConfig(slug);
  const key = FEATURE_MAP[feature];
  if (!key) return { allowed: false, reason: "feature_disabled", packageSlug: slug };
  return e[key] ? { allowed: true, packageSlug: slug } : { allowed: false, reason: "feature_disabled", packageSlug: slug };
}

export function checkPackageLimit(
  packageSlug: string | null | undefined,
  feature: string | PackageLimitKey,
  currentUsage = 0,
): FeatureAccessResult {
  const slug = normalizeStorePackageSlug(packageSlug);
  const limitKey = LIMIT_MAP[feature] ?? (feature as PackageLimitKey);
  const limit = getPackageLimit(slug, limitKey);
  if (!Number.isFinite(limit) || limit < 0) return { allowed: false, reason: "invalid_limit", limit, currentUsage, packageSlug: slug };
  if (currentUsage < limit) return { allowed: true, limit, currentUsage, packageSlug: slug };
  return { allowed: false, reason: slug === "free" ? "free_limit" : "package_limit", limit, currentUsage, packageSlug: slug };
}

export function hasFeature<K extends keyof StoreEntitlements>(packageSlug: string | null | undefined, feature: K): StoreEntitlements[K] {
  return getStoreEntitlements(packageSlug)[feature];
}

export function canAddAdminUser(packageSlug: string | null | undefined, currentAdminCount: number): boolean {
  return checkPackageLimit(packageSlug, "admin", currentAdminCount).allowed;
}

export function canAddProduct(packageSlug: string | null | undefined, currentProductCount: number): boolean {
  return checkFeatureAccess(packageSlug, "products").allowed && checkPackageLimit(packageSlug, "product", currentProductCount).allowed;
}

export function canAddRepairService(packageSlug: string | null | undefined, currentServiceCount: number): boolean {
  return checkFeatureAccess(packageSlug, "repair").allowed && checkPackageLimit(packageSlug, "repair", currentServiceCount).allowed;
}

export function getProductLimit(packageSlug: string | null | undefined): number {
  return getPackageLimit(packageSlug, "product");
}

export function getRepairServiceLimit(packageSlug: string | null | undefined): number {
  return getPackageLimit(packageSlug, "repair");
}

export function getAdminUserLimit(packageSlug: string | null | undefined): number {
  return getPackageLimit(packageSlug, "admin");
}

export function getContactFieldVisibility(
  packageSlug: string | null | undefined,
  field: "phone" | "whatsapp" | "email",
  isAuthenticated: boolean,
): "hidden" | "public" | "login-required" {
  const entitlements = getStoreEntitlements(packageSlug);

  if (field === "phone") {
    if (entitlements.canShowPhonePublic) return "public";
    if (entitlements.canShowPhoneLoginRequired && isAuthenticated) return "login-required";
    return "hidden";
  }
  if (field === "whatsapp") {
    if (entitlements.canShowWhatsAppPublic) return "public";
    if (entitlements.canShowWhatsAppLoginRequired && isAuthenticated) return "login-required";
    return "hidden";
  }
  if (entitlements.canShowEmailPublic) return "public";
  if (entitlements.canShowEmailLoginRequired && isAuthenticated) return "login-required";
  return "hidden";
}

export function sortFeaturedStoresByPriority(stores: Array<{ id: string; package_slug: string | null }>): string[] {
  return stores
    .map((store) => ({ id: store.id, priority: getStoreEntitlements(store.package_slug).featurePlacementPriority }))
    .sort((a, b) => a.priority - b.priority)
    .map((store) => store.id);
}

export function shouldShowFeatureInAdmin(packageSlug: string | null | undefined, feature: string): boolean {
  return checkFeatureAccess(packageSlug, feature).allowed;
}

export function getLockedFeatureMessage(packageSlug: string | null | undefined, feature: string): string {
  const access = checkFeatureAccess(packageSlug, feature);
  if (access.reason === "feature_disabled") return "feature_disabled";
  const limit = checkPackageLimit(packageSlug, feature, Number.MAX_SAFE_INTEGER);
  return limit.reason ?? "package_limit";
}
