import type { ID, Status, UserRole } from "@/types/common";

export interface Profile {
  id: ID;
  full_name: string | null;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole | null;
  status: Status | null;
  bio: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface StaffAdmin {
  id: ID;
  user_id: ID;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  department: string | null;
  status: Status | null;
  assigned_by: ID | null;
  created_at: string;
  updated_at: string;
}

export interface StaffTask {
  id: ID;
  title: string;
  description: string | null;
  assigned_to: ID | null;
  assigned_by: ID | null;
  related_module: string | null;
  related_id: ID | null;
  priority: string | null;
  status: Status | null;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StaffPerformance {
  staff_user_id: ID;
  total_assigned_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  overdue_tasks: number;
  completion_rate: number;
  stores_onboarded: number;
  leads_handled: number;
  repair_requests_handled: number;
  articles_published: number;
}

/**
 * User referral history item
 */
export interface ReferralHistoryItem {
  display_name: string | null;
  email: string | null;
  created_at: string;
}

/**
 * User referral data response
 */
export interface UserReferralData {
  referral_code: string;
  total_earnings: number;
  referred_count: number;
  history: ReferralHistoryItem[];
}

/**
 * Store admin interface
 */
export interface StoreAdmin {
  id: ID;
  user_id: ID;
  store_id: ID;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
  status: Status | null;
  assigned_by: ID | null;
  created_at: string;
  updated_at: string;
}

/**
 * Form input types for admin pages
 */
export interface StaffAdminFormInput {
  full_name: string;
  email: string;
  phone: string;
  department: string;
}

export interface StaffTaskFormInput {
  title: string;
  description?: string;
  assigned_to?: ID;
  related_module?: string;
  related_id?: ID;
  priority?: string;
  due_date?: string;
}

export interface StoreAdminFormInput {
  full_name: string;
  email: string;
  phone: string;
  store_id: ID;
}
