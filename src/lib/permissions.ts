import { PANEL_NAVIGATION } from "@/config/panelNavigation";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "suadmin" | "staffadmin" | "storeadmin" | "user";

export const STAFF_PERMISSION_MODULES = [
  "dashboard",
  "stores",
  "store_admins",
  "store_permissions",
  "products",
  "price_list",
  "brands",
  "orders",
  "leads",
  "payouts",
  "subscriptions",
  "articles",
  "guides",
  "content_pages",
  "community_listings",
  "repair_requests",
  "unlocking_requests",
  "analytics",
  "seo_growth",
  "valuation_manager",
  "audit_logs",
  "mailbox",
  "chatbot_config",
  "user_polls",
  // Backward compatibility module keys already used by existing pages.
  "marketplace",
  "device_verification",
  "repairs",
  "unlocking",
  "content",
  "users",
  "settings",
  "valuation",
] as const;

export const STAFF_PERMISSION_ACTIONS = [
  "view",
  "create",
  "edit",
  "delete",
  "approve",
  "assign",
  "export",
] as const;

export type StaffPermissionModule = (typeof STAFF_PERMISSION_MODULES)[number];
export type StaffPermissionAction = (typeof STAFF_PERMISSION_ACTIONS)[number];

export interface ModulePermissions {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  approve: boolean;
  assign: boolean;
  export: boolean;
}

export type StaffPermissions = Record<StaffPermissionModule, ModulePermissions>;

// Default permissions for a single module
const DEFAULT_MODULE_PERMISSIONS: ModulePermissions = {
  view: false,
  create: false,
  edit: false,
  delete: false,
  approve: false,
  assign: false,
  export: false,
};

function createPermissionSet(value: ModulePermissions = DEFAULT_MODULE_PERMISSIONS): StaffPermissions {
  return STAFF_PERMISSION_MODULES.reduce((acc, moduleKey) => {
    acc[moduleKey] = { ...value };
    return acc;
  }, {} as StaffPermissions);
}

// Default permissions for roles
const DEFAULT_PERMISSIONS: Record<AppRole, StaffPermissions | null> = {
  suadmin: null, // suadmin has all permissions
  staffadmin: createPermissionSet(),
  storeadmin: null, // storeadmin has store-scoped access
  user: null,
};

// Real function to get staffadmin permissions from DB
export async function getStaffPermissions(userId: string): Promise<StaffPermissions | null> {
  if (!userId) return null;

  const { data, error } = await supabase
    .from("staffadmin_permissions")
    .select("module_key, can_view, can_create, can_edit, can_delete, can_approve, can_assign, can_export")
    .eq("user_id", userId);

  // An unavailable permission source must stay distinguishable from a user with
  // no grants. React Query surfaces this error so protected routes fail closed.
  if (error) throw error;

  if (!data || data.length === 0) {
    return createPermissionSet();
  }

  const permissions = createPermissionSet();

  data.forEach((row) => {
    const key = row.module_key as keyof StaffPermissions;
    if (permissions[key]) {
      permissions[key] = {
        view: row.can_view || false,
        create: row.can_create || false,
        edit: row.can_edit || false,
        delete: row.can_delete || false,
        approve: row.can_approve || false,
        assign: row.can_assign || false,
        export: row.can_export || false,
      };
    }
  });

  return permissions;
}

// Module keys suadmin can grant to store admins (store_admins.permissions).
export const STORE_ADMIN_PERMISSION_MODULES = [
  "products",
  "orders",
  "leads",
  "settings",
  "branding",
  "staff",
  "payouts",
] as const;

export type StoreAdminPermissionModule = (typeof STORE_ADMIN_PERMISSION_MODULES)[number];

export async function getStoreAdminPermissions(userId: string): Promise<string[]> {
  if (!userId) return [];

  const { data, error } = await supabase
    .from("store_admins")
    .select("permissions")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1);

  // Keep database outages distinct from a valid empty grant set. The route gate
  // can then show recovery guidance instead of pretending the module is denied.
  if (error) throw error;

  const first = data?.[0] as { permissions?: string[] } | undefined;
  if (!first || !Array.isArray(first.permissions)) return [];

  return first.permissions.filter((p): p is string => typeof p === "string");
}

export function canAccessModule(role: AppRole, moduleKey: string, permissions?: StaffPermissions | null, action: StaffPermissionAction = "view", storeAdminPermissions?: string[]): boolean {
  if (role === "suadmin") return true;

  // Store admins: gate by the module keys suadmin granted them.
  // `undefined` means grants are still loading — allow through so the menu
  // does not flash hidden; `[]` means loaded with no grants — deny.
  if (role === "storeadmin") {
    if (storeAdminPermissions === undefined) return true;
    return storeAdminPermissions.includes(moduleKey);
  }

  if (role === "user") return false;

  const perms = permissions || DEFAULT_PERMISSIONS[role];
  if (!perms) return false;

  const modulePerms = perms[moduleKey as StaffPermissionModule];
  if (!modulePerms) return false;

  return modulePerms[action] === true;
}

export function canSeeMenuItem(role: AppRole, item: { href: string; requiredRole?: AppRole; requiredModule?: string | null; enabled: boolean }, permissions?: StaffPermissions | null, storeAdminPermissions?: string[]): boolean {
  if (!item.enabled) return false;
  if (role === "suadmin") return true;

  // If item has a required role and it's not the current role, hide it
  if (item.requiredRole && item.requiredRole !== role) return false;

  // If it's a staffadmin and item requires a module, check permissions
  if (role === "staffadmin" && item.requiredModule) {
    return canAccessModule(role, item.requiredModule, permissions, "view");
  }

  // If it's a storeadmin and item requires a module, check granted module keys
  if (role === "storeadmin" && item.requiredModule) {
    return canAccessModule(role, item.requiredModule, undefined, "view", storeAdminPermissions);
  }

  return true;
}

type PanelNavigationGroup = (typeof PANEL_NAVIGATION)[string][number];

export function getFilteredMenu(role: AppRole, permissions?: StaffPermissions | null, storeAdminPermissions?: string[]): PanelNavigationGroup[] {
  const navConfig = PANEL_NAVIGATION[role];
  if (!navConfig) return [];

  return navConfig.map(group => ({
    ...group,
    items: group.items.filter(item => canSeeMenuItem(role, item, permissions, storeAdminPermissions))
  })).filter(group => group.items.length > 0);
}
