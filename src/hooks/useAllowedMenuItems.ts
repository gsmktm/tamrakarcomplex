import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { getAllowedMenuItems } from "@/lib/adminMenu";
import type { AppRole } from "@/lib/permissions";

export function useAllowedMenuItems() {
  const { role } = useAuth();
  const { permissions, isLoading } = usePermissions();

  const items = useMemo(() => {
    if (!role) return [];
    return getAllowedMenuItems(role as AppRole, permissions);
  }, [role, permissions]);

  return {
    items,
    loading: isLoading,
  };
}
