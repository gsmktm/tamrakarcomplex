import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  getStaffPermissions,
  getStoreAdminPermissions,
  type StaffPermissionAction,
  type StaffPermissionModule,
} from "@/lib/permissions";

export function usePermissions() {
  const { user, role } = useAuth();

  const staffPermissionsEnabled = !!user?.id && role === "staffadmin";
  const storePermissionsEnabled = !!user?.id && role === "storeadmin";

  const staffQuery = useQuery({
    queryKey: ["staff-permissions", user?.id],
    queryFn: () => getStaffPermissions(user!.id),
    enabled: staffPermissionsEnabled,
    retry: 1,
  });

  const storeQuery = useQuery({
    queryKey: ["store-admin-permissions", user?.id],
    queryFn: () => getStoreAdminPermissions(user!.id),
    enabled: storePermissionsEnabled,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const checkPermission = (module: string, action: StaffPermissionAction = "view") => {
    if (role === "suadmin") return true;
    if (role === "staffadmin") {
      if (!staffQuery.data) return false;
      const modulePerms = staffQuery.data[module as StaffPermissionModule];
      if (!modulePerms) return false;
      return modulePerms[action] === true;
    }
    if (role === "storeadmin") {
      if (storeQuery.data === undefined) return false;
      return storeQuery.data.includes(module);
    }
    return false;
  };

  return {
    permissions: staffQuery.data,
    storeAdminPermissions: storeQuery.data ?? [],
    storeAdminPermissionsLoaded: !storePermissionsEnabled || (!storeQuery.isPending && !storeQuery.isError && storeQuery.data !== undefined),
    isLoading: (staffPermissionsEnabled && staffQuery.isPending) || (storePermissionsEnabled && storeQuery.isPending),
    error: staffQuery.error ?? storeQuery.error ?? null,
    refetch: () => Promise.all([staffQuery.refetch(), storeQuery.refetch()]),
    canAccessModule: checkPermission,
    hasPermission: checkPermission,
  };
}
