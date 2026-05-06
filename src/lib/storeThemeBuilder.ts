export type StorePackageSlug = "free" | "silver" | "gold" | "diamond";

export type StoreThemeSlug =
  | "default"
  | "basic"
  | "modern"
  | "editorial"
  | "premium"
  | "luxury"
  | "atelier"
  | "custom";

export type OpeningHours = Record<string, string>;
export type SocialLinks = {
  facebook?: string;
  instagram?: string;
  tiktok?: string;
  youtube?: string;
  website?: string;
};

export type BannerSettings = {
  title?: string;
  subtitle?: string;
  cta_label?: string;
  cta_url?: string;
};

export const OPENING_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export const STORE_THEME_OPTIONS: Array<{
  slug: StoreThemeSlug;
  label: string;
  minimumPackage: StorePackageSlug;
  description: string;
}> = [
  { slug: "default", label: "Directory", minimumPackage: "free", description: "Simple listing profile." },
  { slug: "basic", label: "Basic Site", minimumPackage: "free", description: "Clean mini-site with cover, services, and hours." },
  { slug: "modern", label: "Modern", minimumPackage: "silver", description: "Product-forward layout for active sellers." },
  { slug: "editorial", label: "Editorial", minimumPackage: "silver", description: "Story-led profile for service brands." },
  { slug: "premium", label: "Premium", minimumPackage: "silver", description: "Higher contrast design with stronger calls to action." },
  { slug: "luxury", label: "Luxury", minimumPackage: "diamond", description: "Flagship presentation for premium stores." },
  { slug: "atelier", label: "Atelier", minimumPackage: "diamond", description: "Repair studio layout with rich service sections." },
  { slug: "custom", label: "Custom", minimumPackage: "diamond", description: "Diamond-only custom design controls." },
];

const PACKAGE_RANK: Record<StorePackageSlug, number> = {
  free: 0,
  silver: 1,
  gold: 2,
  diamond: 3,
};

export function normalizeStorePackage(value: string | null | undefined): StorePackageSlug {
  if (value === "diamond" || value === "gold" || value === "silver") return value;
  return "free";
}

export function canUseStoreTheme(packageSlug: string | null | undefined, themeSlug: StoreThemeSlug) {
  const tier = normalizeStorePackage(packageSlug);
  const option = STORE_THEME_OPTIONS.find((theme) => theme.slug === themeSlug);
  if (!option) return false;
  return PACKAGE_RANK[tier] >= PACKAGE_RANK[option.minimumPackage];
}

export function allowedStoreThemes(packageSlug: string | null | undefined) {
  const tier = normalizeStorePackage(packageSlug);
  return STORE_THEME_OPTIONS.filter((theme) => PACKAGE_RANK[tier] >= PACKAGE_RANK[theme.minimumPackage]);
}

export function getLockedThemeMessage(packageSlug: string | null | undefined, themeSlug: StoreThemeSlug) {
  const option = STORE_THEME_OPTIONS.find((theme) => theme.slug === themeSlug);
  if (!option) return "This theme is not available.";
  const tier = normalizeStorePackage(packageSlug);
  if (tier === "free") return "Upgrade to Silver to unlock premium themes.";
  if (option.minimumPackage === "gold") return "Upgrade to Gold to unlock this theme.";
  if (option.minimumPackage === "diamond") return "Upgrade to Diamond to unlock premium design.";
  return "Upgrade your package to unlock this theme.";
}

export function sanitizeThemeForPackage(packageSlug: string | null | undefined, themeSlug: string | null | undefined): StoreThemeSlug {
  const slug = (themeSlug || "basic") as StoreThemeSlug;
  return canUseStoreTheme(packageSlug, slug) ? slug : "basic";
}
