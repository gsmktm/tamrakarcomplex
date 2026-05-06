import type { ID, PermissionAction } from "@/types/common";

export interface StaffPermission {
  id: ID;
  staff_user_id: ID;
  module_key: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_approve: boolean;
  can_export: boolean;
  granted_by: ID | null;
  created_at: string;
  updated_at: string;
}

export interface StorePermission {
  id: ID;
  store_id: ID;
  store_admin_user_id: ID;
  module_key: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_publish: boolean;
  granted_by: ID | null;
  created_at: string;
  updated_at: string;
}

export interface PermissionMatrixValue {
  module_key: string;
  action: PermissionAction;
  allowed: boolean;
}

/**
 * Form input types for permission pages
 */
export interface StaffPermissionFormInput {
  staff_user_id: ID;
  module_key: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_approve: boolean;
  can_export: boolean;
}

export interface StorePermissionFormInput {
  store_id: ID;
  store_admin_user_id: ID;
  module_key: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_publish: boolean;
}
