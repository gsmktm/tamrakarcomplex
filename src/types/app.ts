import type { Json, Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type AppRole =
  | "suadmin"
  | "staffadmin"
  | "storeadmin"
  | "storestaff"
  | "user";

export type ThemeButtonStyle = "rounded" | "pill" | "square";

export type JsonRecord = Record<string, Json>;

export interface AppSettings {
  site_info: {
    name: string;
    description: string;
    maintenance_mode: boolean;
    favicon_url?: string;
  };
  contact_info: {
    email: string;
    phone: string;
    address: string;
    whatsapp?: string;
  };
  features: {
    enable_blog: boolean;
    enable_reviews: boolean;
    enable_shop: boolean;
    enable_marketplace?: boolean;
    enable_valuation?: boolean;
    enable_repair?: boolean;
    enable_chatbot?: boolean;
    enable_news?: boolean;
    enable_service_desk?: boolean;
    enable_whatsapp?: boolean;
  };
}

export interface SectionConfig {
  key: string;
  label: string;
  enabled: boolean;
  settings?: Record<string, unknown>;
}

export interface FooterConfig {
  showNewsletter: boolean;
  description: string;
  copyrightText: string;
  socialLinks: {
    facebook: string;
    twitter: string;
    instagram: string;
    youtube: string;
    linkedin: string;
  };
  showSocialIcons: boolean;
}

export type StoreRow = Tables<"stores">;
export type StorePageRow = Tables<"store_pages">;
export type StorePageInsert = TablesInsert<"store_pages">;
export type StoreUpdate = TablesUpdate<"stores">;

export type DeviceCatalogRow = Tables<"device_catalog">;
export type DeviceCatalogInsert = TablesInsert<"device_catalog">;

export type ValuationRuleRow = Tables<"valuation_rules">;
export type ValuationRuleInsert = TablesInsert<"valuation_rules">;

export type OrderRow = Tables<"orders">;
export type OrderInsert = TablesInsert<"orders">;
export type OrderItemRow = Tables<"order_items">;
export type OrderItemInsert = TablesInsert<"order_items">;

export type PackageRow = Tables<"packages">;
export type StoreSubscriptionRow = Tables<"store_subscriptions">;
export type SubscriptionPaymentRow = Tables<"subscription_payments">;
export type SubscriptionLogRow = Tables<"subscription_logs">;

export type SellListingRow = Tables<"sell_listings">;
export type UserRoleRow = Tables<"user_roles">;

export type LeadQuoteRow = Tables<"leads_quotes">;
export type RepairRequestRow = Tables<"repair_requests">;

export type ContactInfo = {
  name?: string;
  phone?: string;
};

export type ShippingAddress = {
  address?: string;
  city?: string;
};

export interface AdminUserRecord {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: AppRole;
}

export interface StoreThemeSettings {
  siteName?: string;
  menuItems?: Array<{ name: string; href: string; description?: string }>;
  footerSettings?: FooterConfig;
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  radius?: number;
  buttonStyle?: ThemeButtonStyle;
  containerMaxWidth?: number;
  sections?: SectionConfig[];
  maintenance?: boolean;
  enableLiveEditor?: boolean;
  newsHashtags?: string | string[];
  newsItemsPerPage?: number;
  showPopularProducts?: boolean;
  showFeaturedNews?: boolean;
  theme?: "light" | "dark";
}
