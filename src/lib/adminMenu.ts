import { PANEL_NAVIGATION } from "@/config/panelNavigation";
import { canSeeMenuItem, type AppRole, type StaffPermissions } from "@/lib/permissions";

type MenuItem = {
  label: string;
  href: string;
  requiredRole: AppRole;
  requiredModule?: string | null;
  enabled: boolean;
};

export function getAllowedMenuItems(userRole: AppRole, permissions?: StaffPermissions | null): MenuItem[] {
  const groups = PANEL_NAVIGATION[userRole] ?? [];
  const flattened = groups.flatMap((group) => group.items);
  return flattened.filter((item) => canSeeMenuItem(userRole, item, permissions)) as MenuItem[];
}
