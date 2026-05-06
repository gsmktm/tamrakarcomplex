export type PlatformRole = "SUPER_ADMIN" | "STAFF_ADMIN" | "STORE_ADMIN" | "STORE_STAFF" | "CUSTOMER";

export type PackageSlug = "free" | "silver" | "gold" | "diamond";

export type SubscriptionStatus =
  | "active"
  | "expired"
  | "pending_payment"
  | "suspended"
  | "cancelled"
  | "trial";

export type ReferralStatus = "pending" | "approved" | "rejected" | "paid" | "expired";

export type AnalyticsLevel = "none" | "basic" | "advanced" | "full";
export type SupportLevel = "community" | "standard" | "priority" | "dedicated";

export type PackageEntitlements = {
  productLimit: number;
  marketplaceListingLimit: number;
  storeStaffLimit: number;
  valuationAccess: boolean;
  repairAccess: boolean;
  exchangeAccess: boolean;
  sellDeviceAccess: boolean;
  referralAccess: boolean;
  featuredPlacement: boolean;
  seoControl: boolean;
  analyticsLevel: AnalyticsLevel;
  supportLevel: SupportLevel;
  verifiedBadge: boolean;
  homepageBoost: boolean;
  topSearchRanking: boolean;
  premiumMarketplaceBoost: boolean;
};

export const PACKAGE_DEFAULTS: Record<PackageSlug, PackageEntitlements & { name: string; monthlyPrice: number; rank: number }> = {
  free: {
    name: "Free Listing",
    monthlyPrice: 0,
    rank: 0,
    productLimit: 5,
    marketplaceListingLimit: 2,
    storeStaffLimit: 0,
    valuationAccess: false,
    repairAccess: false,
    exchangeAccess: false,
    sellDeviceAccess: false,
    referralAccess: false,
    featuredPlacement: false,
    seoControl: false,
    analyticsLevel: "none",
    supportLevel: "community",
    verifiedBadge: false,
    homepageBoost: false,
    topSearchRanking: false,
    premiumMarketplaceBoost: false
  },
  silver: {
    name: "Silver Package",
    monthlyPrice: 5000,
    rank: 1,
    productLimit: 50,
    marketplaceListingLimit: 25,
    storeStaffLimit: 1,
    valuationAccess: true,
    repairAccess: true,
    exchangeAccess: false,
    sellDeviceAccess: true,
    referralAccess: false,
    featuredPlacement: false,
    seoControl: true,
    analyticsLevel: "basic",
    supportLevel: "standard",
    verifiedBadge: false,
    homepageBoost: false,
    topSearchRanking: false,
    premiumMarketplaceBoost: false
  },
  gold: {
    name: "Gold Package",
    monthlyPrice: 10000,
    rank: 2,
    productLimit: 200,
    marketplaceListingLimit: 100,
    storeStaffLimit: 5,
    valuationAccess: true,
    repairAccess: true,
    exchangeAccess: true,
    sellDeviceAccess: true,
    referralAccess: true,
    featuredPlacement: true,
    seoControl: true,
    analyticsLevel: "advanced",
    supportLevel: "priority",
    verifiedBadge: true,
    homepageBoost: true,
    topSearchRanking: false,
    premiumMarketplaceBoost: true
  },
  diamond: {
    name: "Diamond Package",
    monthlyPrice: 15000,
    rank: 3,
    productLimit: 1000,
    marketplaceListingLimit: 500,
    storeStaffLimit: 20,
    valuationAccess: true,
    repairAccess: true,
    exchangeAccess: true,
    sellDeviceAccess: true,
    referralAccess: true,
    featuredPlacement: true,
    seoControl: true,
    analyticsLevel: "full",
    supportLevel: "dedicated",
    verifiedBadge: true,
    homepageBoost: true,
    topSearchRanking: true,
    premiumMarketplaceBoost: true
  }
};

export function resolveEntitlements(slug: string | null | undefined, override?: Partial<PackageEntitlements>): PackageEntitlements {
  const key = (slug || "free").toLowerCase() as PackageSlug;
  const base = PACKAGE_DEFAULTS[key] || PACKAGE_DEFAULTS.free;
  return { ...base, ...override };
}

export function assertPackageLimit(currentCount: number, limit: number, label: string) {
  if (limit >= 0 && currentCount >= limit) {
    throw new Error(`${label} limit reached for the current store package.`);
  }
}

export type ReferralRewardInput = {
  productPrice: number;
  explicitMargin?: number | null;
  commissionRate?: number | null;
  referralPercent: number;
  maxReward: number;
  minOrderValue: number;
};

export function calculateReferralReward(input: ReferralRewardInput) {
  if (input.productPrice < input.minOrderValue) {
    return { rewardPoints: 0, margin: 0, needsMarginReview: false };
  }

  const estimatedMargin = input.productPrice * ((input.commissionRate ?? 10) / 100);
  const margin = input.explicitMargin && input.explicitMargin > 0 ? input.explicitMargin : estimatedMargin;
  const rawReward = margin * (input.referralPercent / 100);

  return {
    rewardPoints: Math.max(0, Math.round(Math.min(rawReward, input.maxReward))),
    margin,
    needsMarginReview: !input.explicitMargin
  };
}
