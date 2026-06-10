import type { AppRole } from "@/types/app";

/**
 * Normalizes a role string into one of the valid AppRole types.
 * Supports legacy role mapping for backward compatibility.
 */
export function normalizeRole(role?: string | null): AppRole {
  if (!role) return "user";
  
  const normalized = role.toLowerCase().trim();
  
  switch (normalized) {
    case "suadmin":
      return "suadmin";
    case "staffadmin":
    case "admin":
      return "staffadmin";
    case "storeadmin":
    case "store_owner":
    case "moderator":
      return "storeadmin";
    case "storestaff":
    case "store_staff":
    case "staff":
      return "storestaff";
    case "user":
    case "public_user":
    case "customer":
      return "user";
    default:
      return "user";
  }
}

export function getRoleFromEmail(email?: string | null): AppRole | null {
  if (!email) return null;
  return null;
}

/**
 * Checks if the role has platform-wide management access (Super Admin or Staff Admin).
 */
export function isAdminRole(role?: string | null) {
  const normalized = normalizeRole(role);
  return normalized === "suadmin" || normalized === "staffadmin";
}

/**
 * Checks if the role is Super Admin.
 */
export function isSuperAdminRole(role?: string | null) {
  const normalized = normalizeRole(role);
  return normalized === "suadmin";
}

/**
 * Checks if the role has store-level management access.
 */
export function isStoreAdminRole(role?: string | null) {
  const normalized = normalizeRole(role);
  // Super admins and Staff admins can also manage stores globally
  return normalized === "suadmin" || normalized === "staffadmin" || normalized === "storeadmin";
}

/**
 * Legacy alias for isStoreAdminRole.
 */
export function isStoreOwnerRole(role?: string | null) {
  return isStoreAdminRole(role);
}

/**
 * Maps legacy roles to the new 4-panel architecture.
 */
export function mapLegacyRole(role?: string | null): AppRole {
  return normalizeRole(role);
}

/**
 * Returns a human-readable label for the role.
 */
export function getRoleLabel(role?: string | null) {
  switch (normalizeRole(role)) {
    case "suadmin":
      return "Super Admin";
    case "staffadmin":
      return "Staff Admin";
    case "storeadmin":
      return "Store Admin";
    case "storestaff":
      return "Store Staff";
    case "user":
      return "User";
    default:
      return "User";
  }
}

/**
 * Returns the badge variant color based on the role.
 */
export function getRoleBadgeVariant(role?: string | null): "destructive" | "default" | "secondary" | "outline" {
  switch (normalizeRole(role)) {
    case "suadmin":
      return "destructive";
    case "staffadmin":
      return "default";
    case "storeadmin":
      return "outline";
    default:
      return "secondary";
  }
}
