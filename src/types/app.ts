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

export type PackageRow = {
  id: string;
  name: string;
  slug: string;
  price: number;
  billing_cycle: string;
  product_limit: number;
  accessory_limit: number;
  staff_limit: number;
  [key: string]: unknown;
};
// The following tables are not present in the generated Supabase types (stale
// generation). Model each explicitly from its canonical migration so consumers
// keep typed access without regenerating the schema.

export interface StoreSubscriptionRow {
  id: string;
  store_id: string;
  package_id: string;
  status: string;
  is_enabled: boolean | null;
  start_date: string;
  end_date: string;
  next_billing_date: string | null;
  auto_renew: boolean | null;
  scheduled_package_id: string | null;
  scheduled_change_date: string | null;
  cancelled_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface SubscriptionPaymentRow {
  id: string;
  subscription_id: string;
  invoice_no: string;
  amount: number;
  payment_method: string;
  payment_status: string;
  paid_at: string | null;
  transaction_ref: string | null;
  meta_json: Json | null;
  created_at: string | null;
}

// subscription_logs is not present in the generated Supabase types (stale
// generation). Model it explicitly from the canonical migration so consumers
// keep typed access without regenerating the schema.
export interface SubscriptionLogRow {
  id: string;
  store_id: string;
  actor_id: string | null;
  action: string;
  old_value_json: Json | null;
  new_value_json: Json | null;
  created_at: string | null;
}

export type SellListingRow = Tables<"sell_listings">;
export type UserRoleRow = Tables<"user_roles">;

// leads_quotes is not present in the generated Supabase types (stale
// generation). Model it explicitly from the canonical migration. The quotes
// feed is heterogeneous (sell_listings / sell_phone_leads projections), so an
// index signature keeps every real field access type-safe.
export interface LeadQuoteRow {
  id: string;
  user_id: string | null;
  name: string;
  phone: string;
  email: string | null;
  device_brand: string | null;
  device_model: string | null;
  condition: string | null;
  quote_amount: number | null;
  quoted_value?: number;
  status: string;
  type?: string;
  assigned_store: string | null;
  assigned_store_id?: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}
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
