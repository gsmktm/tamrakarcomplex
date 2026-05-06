# AI Data Model

Supabase is the main backend. The app uses direct table queries, RPCs, storage buckets, auth sessions, and edge functions.

## Supabase Client

- Client file: `src/integrations/supabase/client.ts`
- Generated types: `src/integrations/supabase/types.ts`
- Runtime import pattern:

```ts
import { supabase } from "@/integrations/supabase/client";
```

The app intentionally exports `supabase` as an untyped client because migrations move faster than generated types. Use `supabaseTyped` only when the generated schema is known to be current.

## Main Tables By Feature

Auth and profiles:

- `profiles`
- `user_roles`
- `staff_admins`
- `staff_permissions`
- `staffadmin_permissions`
- `store_admins`
- `store_staff`
- `audit_logs`
- `user_login_history`

Public content:

- `articles`
- `guides`
- `comments`
- `polls`
- `poll_votes`
- `content_pages`
- `site_content`
- `page_layouts`
- `seo_pages`
- `homepage_settings`
- `home_offers`
- `chatbot_config`
- `chatbot_configs`
- `contact_messages`
- `newsletter_subscribers`
- `newsletter_rate_limits`

Products, catalog, and price list:

- `products`
- `brands`
- `catalog_products`
- `device_catalog`
- `valuation_rules`
- `device_verifications`
- `device_search_events`

Stores and subscriptions:

- `stores`
- `store_pages`
- `store_applications`
- `store_inventory`
- `packages`
- `store_subscriptions`
- `subscription_payments`
- `subscription_logs`
- `store_lead_preferences`
- `store_credit_balances`
- `store_credit_transactions`

Marketplace and commerce:

- `sell_listings`
- `marketplace_listings`
- `listing_inquiries`
- `orders`
- `order_items`
- `payments`
- `payouts`
- `sell_phone_leads`
- `leads_quotes`

Repair and unlocking:

- `repair_requests`
- `repair_services`
- `repair_categories`
- `repair_devices`
- `repair_guides`
- `repair_steps`
- `repair_tools`
- `repair_parts`
- `repair_guide_tools`
- `repair_guide_parts`
- `unlock_catalog`
- `unlock_requests`

User account history/rewards:

- `wishlist`
- `user_devices`
- `exchange_requests`
- `referral_history`
- `referral_invites`
- `user_rewards`
- `user_risk_flags`
- `user_addresses`
- `user_wallets`
- `wallet_transactions`

System/admin:

- `app_settings`
- `system_settings`
- `console_settings`
- `admin_tasks`
- `admin_task_comments`
- `platform_health_logs`
- `mailbox_messages`
- `social_oauth_tokens`
- `visitor_logs`

## Important RPCs Used By Code

- `get_my_roles`
- `get_admin_users_list_secure`
- `manage_user_role`
- `grant_role_by_email`
- `revoke_role_by_email`
- `delete_user`
- `cleanup_demo_accounts`
- `get_stores_directory`
- `get_eligible_repair_stores`
- `assign_repair_to_store`
- `get_repair_tracking`
- `find_duplicate_catalog_products`
- `get_catalog_verification_stats`
- `auto_merge_catalog_duplicates`
- `calculate_device_valuation`
- `assign_lead_to_store`
- `generate_seo_sitemap`
- `get_poll_results`

## Storage Buckets

Buckets referenced by code:

- `avatars`
- `logos`
- `marketplace`

Image upload paths commonly include `products/...` for marketplace/product images and per-user paths for avatars.

## RLS And Permission Notes

- RLS policies are spread across many migrations and were hardened over time.
- Use the latest migrations as the best signal for final role behavior:
  - `20260501000000_marketplace_foundation_hardening.sql`
  - `20260501010000_role_scope_and_rls_lock.sql`
  - `20260430012000_production_hardening.sql`
  - `20260430015000_normalize_roles_and_rls.sql`
  - `20260430009000_strong_staff_permissions_work_control.sql`
  - `20260426_marketplace_rls_policies.sql`
  - `20260426000001_enforce_package_limits_rls.sql`
- Staff admin permissions are both UI-level and database/RPC-level. Do not rely on hidden menus as security.
- Store admin access must stay scoped through `store_admins`, `owner_id`, or store-specific policies/RPCs.
- Public insert exists for some lead/contact/repair flows; sanitize and validate inputs before insert.

## Edge Function Data Flow

- Order creation:
  - Frontend cart/checkout calls `create-order-secure`.
  - Function validates product/catalog rows and writes `orders` + `order_items`.
- Payments:
  - `create-payment-session` starts payment and writes `payments`.
  - `verify-payment` updates `orders` and `payments`.
- Newsletter:
  - `newsletter-subscribe` checks `newsletter_rate_limits` and writes `newsletter_subscribers`.
- Valuation:
  - `valuation-estimator` reads `device_catalog` and `valuation_rules`.
  - `/sell-your-phone` uses `sellPhoneService.calculateValuation`, which prefers the `calculate_device_valuation` RPC and falls back to catalog price heuristics if valuation rules/RPC data are unavailable.
  - Lead capture writes canonical data to `sell_phone_leads` and mirrors to `leads_quotes` for dashboards that still read the older quote table.
- Import:
  - Product/article import functions check user roles/permissions before writing `products` or `articles`.
- SEO:
  - `sitemap` uses `generate_seo_sitemap`.

## Migration Reading Strategy

1. Search migrations for the table/RPC name.
2. Read the latest dated migration first.
3. Check if older migrations created the base schema and later migrations altered/hardened it.
4. Match code queries in `src/` to table columns before changing types or payloads.
5. If Supabase types are stale, document the schema assumption in code comments sparingly and update generated types when possible.

## Sell Phone Schema Compatibility

- Current compatibility migration: `supabase/migrations/20260504090000_repair_sell_phone_valuation_flow.sql`.
- Older migrations disagree on lead columns:
  - `sell_phone_leads`: legacy `name`, `phone`, `device_brand`, `device_model`, `asking_price`; newer flow uses `customer_name`, `customer_phone`, `customer_email`, `brand`, `model`, `storage`, `defects`, `quoted_value`, `assigned_store_id`.
  - `leads_quotes`: older quote dashboards expect `device`, `type`, `defects`, `quoted_value`; newer missing-table migration added `name`, `phone`, `device_brand`, `device_model`, `quote_amount`.
- Keep inserts tolerant unless the deployed database is verified to have the latest migration applied.
