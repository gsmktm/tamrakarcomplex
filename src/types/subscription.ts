export interface Package {
  id: string;
  name: string;
  slug: string;
  monthly_price: number;
  yearly_price: number;
  product_limit: number;
  admin_limit: number;
  branch_limit: number;
  promo_slot_limit: number;
  features_json: string[];
  is_active: boolean;
  is_popular?: boolean;
  sort_order: number;
}

export interface StoreSubscription {
  id: string;
  store_id: string;
  package_id: string;
  status: 'active' | 'pending' | 'expired' | 'suspended' | 'cancelled';
  is_enabled: boolean;
  start_date: string;
  end_date: string;
  next_billing_date: string;
  auto_renew: boolean;
  scheduled_package_id?: string;
  scheduled_change_date?: string;
  package?: Package; // Joined
}

export interface StoreUsage {
  id: string;
  store_id: string;
  total_products: number;
  total_admins: number;
  total_branches: number;
  total_promo_slots: number;
  updated_at: string;
}

export interface SubscriptionPayment {
  id: string;
  subscription_id: string;
  invoice_no: string;
  amount: number;
  payment_method: string;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  paid_at?: string;
  created_at: string;
}

export interface SubscriptionLog {
  id: string;
  store_id: string;
  actor_id: string;
  action: string;
  old_value_json?: Json;
  new_value_json?: Json;
  created_at: string;
}
import type { Json } from "@/integrations/supabase/types";
