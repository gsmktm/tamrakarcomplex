export const STORES_COLUMNS = [
  "id",
  "name",
  "slug",
  "package_slug",
  "owner_id",
  "owner_user_id",
  "description",
  "address",
  "phone",
  "email",
  "website",
  "timezone",
  "currency",
  "status",
  "featured",
  "verified",
  "created_at",
  "updated_at",
] as const;

export const PRODUCTS_COLUMNS = [
  "id",
  "name",
  "slug",
  "price",
  "category",
  "brand",
  "series",
  "price_value",
  "image",
  "images",
  "highlights",
  "specs",
  "description",
  "source_url",
  "source_site",
  "rating",
  "reviews_count",
  "featured",
  "in_stock",
  "created_at",
  "store_id",
  "video_url",
] as const;

export const REPAIR_REQUESTS_COLUMNS = [
  "id",
  "tracking_id",
  "tracking_code",
  "store_id",
  "user_id",
  "assigned_store_id",
  "name",
  "phone",
  "email",
  "device_model",
  "issue_type",
  "description",
  "status",
  "urgency",
  "estimated_cost",
  "final_cost",
  "internal_notes",
  "created_at",
  "updated_at",
] as const;

export const PAGINATION = {
  PAGE_SIZE: 50,
  PAGE_SIZE_SMALL: 20,
} as const;

export const STORE_PACKAGES_COLUMNS = [
  "id", "name", "slug", "price", "billing_cycle", "product_limit",
  "accessory_limit", "staff_limit", "exchange_enabled", "repair_enabled",
  "custom_seo_enabled", "analytics_level", "featured_enabled",
  "verified_badge_enabled", "homepage_promotion_enabled",
] as const;

export const ARTICLES_COLUMNS = [
  "id", "title", "slug", "excerpt", "content", "author", "category",
  "category_label", "image", "source_url", "source_site", "read_time",
  "published", "featured", "views", "created_at", "updated_at",
] as const;

export const GUIDES_COLUMNS = [
  "id", "title", "slug", "excerpt", "content", "category", "guide_type",
  "author", "image", "source_url", "source_site", "read_time",
  "published", "featured", "created_at", "updated_at",
] as const;

export const POLLS_COLUMNS = [
  "id", "question", "options", "active", "end_date", "total_votes",
  "created_at",
] as const;

export const CONTACT_MESSAGES_COLUMNS = [
  "id", "name", "email", "subject", "message", "is_read", "created_at",
] as const;

export const SELL_LISTINGS_COLUMNS = [
  "id", "title", "price", "description", "listing_type", "category",
  "condition", "brand", "model", "location", "contact_info",
  "images", "status", "currency", "created_at", "updated_at", "user_id",
] as const;

export const CONTENT_PAGES_COLUMNS = [
  "id", "title", "slug", "content", "is_published", "meta_title",
  "meta_description", "og_image", "category", "order_index", "created_at",
  "updated_at",
] as const;

export const USER_DEVICES_COLUMNS = [
  "id", "user_id", "device_type", "device_name", "last_active",
  "created_at",
] as const;

export const MARKETING_BANNERS_COLUMNS = [
  "id", "title", "subtitle", "image_url", "link_url", "button_text",
  "placement", "is_active", "sort_order", "starts_at", "ends_at",
] as const;

export const ACCESSORIES_COLUMNS = [
  "id", "title", "category", "price", "stock_quantity", "status",
  "store_id", "created_at", "updated_at",
] as const;

export const UNLOCK_REQUESTS_COLUMNS = [
  "id", "customer_name", "customer_phone", "customer_email", "brand",
  "model", "device_brand", "device_model", "service_type", "imei",
  "serial_number", "status", "assigned_store_id", "quoted_price_npr",
  "payment_status", "urgency", "notes", "created_at", "updated_at",
] as const;

export const APP_SETTINGS_COLUMNS = [
  "key", "value", "created_at", "updated_at",
] as const;

export const PROFILES_COLUMNS = [
  "id", "avatar_url", "bio", "display_name", "user_id",
  "created_at", "updated_at",
] as const;

export const STORE_APPLICATIONS_COLUMNS = [
  "id", "store_name", "owner_name", "contact_name", "business_name",
  "email", "phone", "location", "shop_number", "requested_package_slug",
  "billing_cycle", "message", "description", "logo_url", "license_url",
  "status", "created_at", "updated_at",
] as const;

export const SEO_PAGES_COLUMNS = [
  "id", "route_key", "path", "title", "description", "keywords",
  "og_image", "noindex", "is_active", "updated_at",
] as const;

export const VISITOR_LOGS_COLUMNS = [
  "id", "created_at", "ip_address", "country", "city", "url",
  "referrer", "is_unique",
] as const;

export const ORDERS_COLUMNS = [
  "id", "user_id", "status", "total_amount", "payment_method",
  "payment_status", "transaction_id", "contact_info", "shipping_address",
  "created_at", "updated_at",
] as const;

export const SELL_PHONE_LEADS_COLUMNS = [
  "id", "customer_name", "customer_phone", "customer_email", "preferred_contact",
  "device_brand", "device_model", "budget_min", "budget_max", "notes",
  "status", "assigned_store_id", "created_at", "updated_at",
] as const;

export const STORE_REPAIR_SERVICES_COLUMNS = [
  "id", "store_id", "service_name", "description", "price", "estimated_duration",
  "is_active", "created_at", "updated_at",
] as const;

export const EXCHANGE_REQUESTS_COLUMNS = [
  "id", "store_id", "customer_name", "customer_phone", "customer_email",
  "device_brand", "device_model", "serial_number", "issue_description",
  "desired_model", "estimated_value", "status", "notes", "created_at", "updated_at",
] as const;

export const STORE_REVIEWS_COLUMNS = [
  "id", "store_id", "product_id", "user_id", "rating", "title", "comment",
  "is_approved", "created_at", "updated_at",
] as const;

export const STORE_MEDIA_COLUMNS = [
  "id", "store_id", "media_type", "media_url", "alt_text", "is_featured",
  "sort_order", "created_at",
] as const;

export const STORE_SETTINGS_COLUMNS = [
  "id", "store_id", "setting_key", "setting_value", "setting_type",
  "section", "is_editable", "created_at", "updated_at",
] as const;

export const ADMIN_TASKS_COLUMNS = [
  "id", "title", "description", "assigned_role_type", "status",
  "priority", "created_by", "assigned_to", "due_date", "completed_at",
  "created_at", "updated_at",
] as const;

export const USER_ACTIVITY_HISTORY_COLUMNS = [
  "id", "user_id", "activity_type", "status", "description", "created_at",
] as const;
