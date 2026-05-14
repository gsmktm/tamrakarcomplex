import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { getStaffPermissions, type StaffPermissions, type StaffPermissionAction, type StaffPermissionModule } from "@/lib/permissions";

export function usePermissions() {
  const { user, role } = useAuth();

  const { data: permissions, isLoading } = useQuery({
    queryKey: ["staff-permissions", user?.id],
    queryFn: () => getStaffPermissions(user!.id),
    enabled: !!user?.id && role === "staffadmin",
  });

  const checkPermission = (module: string, action: StaffPermissionAction = "view") => {
    if (role === "suadmin") return true;
    if (role !== "staffadmin") return false;
    if (!permissions) return false;
    
    const modulePerms = permissions[module as StaffPermissionModule];
    if (!modulePerms) return false;
    
    return modulePerms[action] === true;
  };

  return {
    permissions,
    isLoading,
    canAccessModule: checkPermission,
    hasPermission: checkPermission,
  };
}
