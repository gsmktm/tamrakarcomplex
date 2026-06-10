import type { Json } from "@/integrations/supabase/types";
import type { AppSettings, FooterConfig, SectionConfig, StoreThemeSettings } from "@/types/app";

export const APP_SETTINGS_STORAGE_KEY = "app-settings";
export const THEME_SETTINGS_STORAGE_KEY = "theme-settings";

export const DEFAULT_SECTIONS: SectionConfig[] = [
  { key: "hero", label: "Hero Banner", enabled: true, settings: {} },
  { key: "serviceMatrix", label: "Service Matrix", enabled: true, settings: {} },
  { key: "priceDesk", label: "Price Desk", enabled: true, settings: {} },
  { key: "featured", label: "Featured Products", enabled: true, settings: {} },
  { key: "storesAndStories", label: "Stores and Stories", enabled: true, settings: {} },
  { key: "trust", label: "Trust Section", enabled: true, settings: {} },
  { key: "poll", label: "Community Poll", enabled: true, settings: { background: "gradient" } },
  { key: "chat", label: "Chat Widget", enabled: true, settings: { position: "bottom-right" } },
];

export const DEFAULT_FOOTER_SETTINGS: FooterConfig = {
  showNewsletter: true,
  description:
    "Tamrakar Complex brings product discovery, price intelligence, instant selling, exchange, repair booking, and trusted store discovery into one Nepal-first gadget platform.",
  copyrightText: "© 2026 Tamrakar Complex. All rights reserved.",
  showSocialIcons: true,
  socialLinks: {
    facebook: "#",
    twitter: "#",
    instagram: "#",
    youtube: "#",
    linkedin: "#",
  },
};

export const DEFAULT_THEME_SETTINGS: StoreThemeSettings = {
  siteName: "Tamrakar Complex",
  primaryColor: "",
  secondaryColor: "",
  fontFamily: "",
  radius: 4,
  buttonStyle: "sharp",
  containerMaxWidth: 1400,
  maintenance: false,
  menuItems: [
    { name: "Home", href: "/" },
    { name: "Price List", href: "/mobile-price" },
    { name: "Marketplace", href: "/marketplace" },
    { name: "Stores", href: "/stores" },
    { name: "Services", href: "/services" },
    { name: "Contact", href: "/contact-us" },
  ],
  footerSettings: DEFAULT_FOOTER_SETTINGS,
  enableLiveEditor: false,
  newsHashtags: "#NepalTech,#GadgetLaunches,#PriceUpdate",
  newsItemsPerPage: 16,
  showPopularProducts: true,
  showFeaturedNews: true,
  sections: DEFAULT_SECTIONS,
  theme: "light",
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  site_info: {
    name: "Tamrakar Complex",
    description:
      "Tamrakar Complex brings product discovery, pricing, selling, exchange, repair, and trusted stores into one platform.",
    maintenance_mode: false,
    favicon_url: "/favicon.ico",
  },
  contact_info: {
    email: "info@tamrakarcomplex.com",
    phone: "+977-015351731",
    address: "New Road TamrakarComplex , Kathmandu",
    whatsapp: "+9779851091542",
  },
  features: {
    enable_blog: true,
    enable_reviews: true,
    enable_shop: true,
    enable_marketplace: true,
    enable_valuation: true,
    enable_repair: true,
    enable_chatbot: true,
    enable_news: true,
    enable_service_desk: true,
    enable_whatsapp: true,
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeMenuHref(href: string) {
  const trimmed = href.trim();

  if (!trimmed) {
    return "/";
  }

  if (
    trimmed.startsWith("/") ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("?") ||
    trimmed.startsWith("//") ||
    /^[a-z][a-z\d+\-.]*:/i.test(trimmed)
  ) {
    return trimmed;
  }

  return `/${trimmed.replace(/^\.?\//, "")}`;
}

function normalizeMenuItems(
  value: unknown,
): Array<{ name: string; href: string; description?: string }> {
  if (!Array.isArray(value)) {
    return DEFAULT_THEME_SETTINGS.menuItems;
  }

  const items: Array<{ name: string; href: string; description?: string }> = [];
  for (const raw of value) {
    if (!isRecord(raw)) continue;
    const name = typeof raw.name === "string" ? raw.name.trim() : "";
    const href = typeof raw.href === "string" ? normalizeMenuHref(raw.href) : "";
    const description = typeof raw.description === "string" ? raw.description.trim() : undefined;
    if (!name || !href) continue;
    items.push(description ? { name, href, description } : { name, href });
  }

  return items.length > 0 ? items : DEFAULT_THEME_SETTINGS.menuItems;
}

function readJsonStorage<T>(key: string): T | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJsonStorage<T>(key: string, value: T, eventName: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event(eventName));
}

export function mergeThemeSettings(value: unknown): StoreThemeSettings {
  const parsed = isRecord(value) ? value : {};
  const footer = isRecord(parsed.footerSettings) ? (parsed.footerSettings as Record<string, unknown>) : {};
  const footerSocial = isRecord(footer.socialLinks) ? (footer.socialLinks as Record<string, unknown>) : {};
  return {
    ...DEFAULT_THEME_SETTINGS,
    ...parsed,
    menuItems: normalizeMenuItems(parsed.menuItems),
    footerSettings: {
      ...DEFAULT_FOOTER_SETTINGS,
      ...footer,
      socialLinks: {
        ...DEFAULT_FOOTER_SETTINGS.socialLinks,
        ...footerSocial,
      },
    },
    sections: Array.isArray(parsed.sections) ? (parsed.sections as SectionConfig[]) : DEFAULT_SECTIONS,
  };
}

export function mergeAppSettings(value: unknown): AppSettings {
  const parsed = isRecord(value) ? value : {};
  
  // Deep merge for contact_info to ensure all fields exist
  const contact_info = {
    ...DEFAULT_APP_SETTINGS.contact_info,
    ...(isRecord(parsed.contact_info) ? parsed.contact_info : {}),
  };

  return {
    site_info: {
      ...DEFAULT_APP_SETTINGS.site_info,
      ...(isRecord(parsed.site_info) ? parsed.site_info : {}),
    },
    contact_info,
    features: {
      ...DEFAULT_APP_SETTINGS.features,
      ...(isRecord(parsed.features) ? parsed.features : {}),
    },
  };
}

/**
 * Resets local storage settings to defaults
 */
export function resetAppSettings() {
  writeAppSettings(DEFAULT_APP_SETTINGS);
}

export function readThemeSettings(): StoreThemeSettings {
  return mergeThemeSettings(readJsonStorage<StoreThemeSettings>(THEME_SETTINGS_STORAGE_KEY));
}

export function writeThemeSettings(settings: StoreThemeSettings) {
  writeJsonStorage(THEME_SETTINGS_STORAGE_KEY, mergeThemeSettings(settings), "theme-update");
}

export function readAppSettings(): AppSettings {
  return mergeAppSettings(readJsonStorage<AppSettings>(APP_SETTINGS_STORAGE_KEY));
}

export function writeAppSettings(settings: AppSettings) {
  writeJsonStorage(APP_SETTINGS_STORAGE_KEY, mergeAppSettings(settings), "app-settings-update");
}

export function buildAppSettingsRows(settings: AppSettings): Array<{ key: keyof AppSettings; value: Json }> {
  return [
    { key: "site_info", value: settings.site_info as Json },
    { key: "contact_info", value: settings.contact_info as Json },
    { key: "features", value: settings.features as Json },
  ];
}
