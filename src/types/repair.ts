import type { ID, Status } from "@/types/common";

export interface RepairRequest {
  id: ID;
  user_id: ID | null;
  store_id: ID | null;
  device_brand: string | null;
  device_model: string | null;
  problem_type: string | null;
  description: string | null;
  phone: string | null;
  location: string | null;
  status: Status | null;
  tracking_code: string | null;
  assigned_to: ID | null;
  estimated_cost: number | null;
  final_cost: number | null;
  created_at: string;
  updated_at: string;
}

export interface UnlockingRequest {
  id: ID;
  user_id: ID | null;
  store_id: ID | null;
  device_brand: string | null;
  device_model: string | null;
  service_type: string | null;
  imei: string | null;
  phone: string | null;
  status: Status | null;
  price: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Form input types for repair pages
 */
export interface RepairStatusUpdateInput {
  status: Status;
  assigned_to?: ID;
  estimated_cost?: number;
  final_cost?: number;
}

export interface UnlockingStatusUpdateInput {
  status: Status;
  price?: number;
  notes?: string;
}
