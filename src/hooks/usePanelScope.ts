import { useAuth } from "@/hooks/useAuth";

export function usePanelScope() {
  const { role, user } = useAuth();

  // Determine panel type from pathname
  const pathname = window.location.pathname;
  const panelType = pathname.startsWith("/suadmin") ? "suadmin"
    : pathname.startsWith("/staffadmin") ? "staffadmin"
    : pathname.startsWith("/storeadmin") ? "storeadmin"
    : "user";

  // For storeadmin, get store context
  const storeId = panelType === "storeadmin" ? user?.id : null; // Assuming user.id is store owner id

  const isElevated = panelType === "staffadmin" && role === "suadmin";

  return {
    panelType,
    storeId,
    isElevated,
    role,
    isGlobalScope: panelType === "suadmin" || panelType === "staffadmin",
    isStoreScope: panelType === "storeadmin",
    isUserScope: panelType === "user",
  };
}