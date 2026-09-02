import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  getStaffPermissions,
  getStoreAdminPermissions,
  type StaffPermissions,
  type StaffPermissionAction,
  type StaffPermissionModule,
} from "@/lib/permissions";

export function usePermissions() {
  const { user, role } = useAuth();

  const { data: permissions, isLoading } = useQuery({
    queryKey: ["staff-permissions", user?.id],
    queryFn: () => getStaffPermissions(user!.id),
    enabled: !!user?.id && role === "staffadmin",
  });

  const { data: storeAdminPermissions, isLoading: storeAdminPermissionsLoading } = useQuery({
    queryKey: ["store-admin-permissions", user?.id],
    queryFn: () => getStoreAdminPermissions(user!.id),
    enabled: !!user?.id && role === "storeadmin",
    staleTime: 5 * 60 * 1000,
  });

  const checkPermission = (module: string, action: StaffPermissionAction = "view") => {
    if (role === "suadmin") return true;
    if (role === "staffadmin") {
      if (!permissions) return false;
      const modulePerms = permissions[module as StaffPermissionModule];
      if (!modulePerms) return false;
      return modulePerms[action] === true;
    }
    if (role === "storeadmin") {
      // While grants load, allow (menu stays usable); once loaded, gate.
      if (storeAdminPermissions === undefined) return true;
      return storeAdminPermissions.includes(module);
    }
    return false;
  };

  return {
    permissions,
    storeAdminPermissions: storeAdminPermissions ?? [],
    storeAdminPermissionsLoaded: !storeAdminPermissionsLoading && storeAdminPermissions !== undefined,
    isLoading: isLoading || storeAdminPermissionsLoading,
    canAccessModule: checkPermission,
    hasPermission: checkPermission,
  };
}
