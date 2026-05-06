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

  try {
    const { data, error } = await supabase
      .from("staff_permissions")
      .select("module_key, can_view, can_create, can_edit, can_delete, can_approve, can_assign, can_export")
      .eq("staff_user_id", userId);

    if (error) {
      console.error("Error fetching staff permissions:", error);
      return createPermissionSet();
    }

    if (!data || data.length === 0) {
      return createPermissionSet();
    }

    // Initialize all modules with default false
    const permissions = createPermissionSet();

    // Map the array of rows to the StaffPermissions object structure
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
  } catch (err) {
    console.error("Unexpected error in getStaffPermissions:", err);
    return createPermissionSet();
  }
}

export function canAccessModule(role: AppRole, moduleKey: string, permissions?: StaffPermissions | null, action: StaffPermissionAction = "view"): boolean {
  if (role === "suadmin") return true;
  if (role === "storeadmin" || role === "user") return false;

  const perms = permissions || DEFAULT_PERMISSIONS[role];
  if (!perms) return false;

  const modulePerms = perms[moduleKey as StaffPermissionModule];
  if (!modulePerms) return false;

  return modulePerms[action] === true;
}

export function canSeeMenuItem(role: AppRole, item: { href: string; requiredRole?: AppRole; requiredModule?: string | null; enabled: boolean }, permissions?: StaffPermissions | null): boolean {
  if (!item.enabled) return false;
  if (role === "suadmin") return true;

  // If item has a required role and it's not the current role, hide it
  if (item.requiredRole && item.requiredRole !== role) return false;

  // If it's a staffadmin and item requires a module, check permissions
  if (role === "staffadmin" && item.requiredModule) {
    return canAccessModule(role, item.requiredModule, permissions, "view");
  }

  return true;
}

type PanelNavigationGroup = (typeof PANEL_NAVIGATION)[string][number];

export function getFilteredMenu(role: AppRole, permissions?: StaffPermissions | null): PanelNavigationGroup[] {
  const navConfig = PANEL_NAVIGATION[role];
  if (!navConfig) return [];

  return navConfig.map(group => ({
    ...group,
    items: group.items.filter(item => canSeeMenuItem(role, item, permissions))
  })).filter(group => group.items.length > 0);
}
