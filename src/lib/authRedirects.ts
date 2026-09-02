import type { Location } from "react-router-dom";
import type { AppRole } from "@/types/app";

export function getDashboardPathForRole(role?: AppRole | null) {
  switch (role) {
    case "suadmin":
      return "/suadmin";
    case "staffadmin":
      return "/staffadmin";
    case "storeadmin":
      return "/storeadmin";
    default:
      return "/user";
  }
}

export function getProfilePathForRole(role?: AppRole | null) {
  switch (role) {
    case "suadmin":
      return "/suadmin/me";
    case "staffadmin":
      return "/staffadmin/me";
    case "storeadmin":
      return "/storeadmin/me";
    default:
      return "/user/me";
  }
}

export function locationToPath(location: Pick<Location, "pathname" | "search" | "hash">) {
  return `${location.pathname}${location.search}${location.hash}`;
}

export function getAuthPathForLocation(location: Pick<Location, "pathname" | "search" | "hash">) {
  return `/auth?redirect=${encodeURIComponent(locationToPath(location))}`;
}

export function getSafeLocalRedirectPath(value?: string | null) {
  if (!value) return null;

  try {
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const parsed = new URL(value, origin);

    if (parsed.origin !== origin) return null;
    if (!parsed.pathname.startsWith("/")) return null;

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

export function isRolePanelPath(role: AppRole | null | undefined, path: string) {
  if (path.startsWith("/suadmin")) return role === "suadmin";
  if (path.startsWith("/staffadmin")) return role === "staffadmin";
  if (path.startsWith("/storeadmin")) return role === "storeadmin";
  if (path.startsWith("/user")) return !role || role === "user";
  return true;
}

export function getPostLoginRedirectPath(role: AppRole | null | undefined, requestedPath?: string | null) {
  const safePath = getSafeLocalRedirectPath(requestedPath);

  if (!safePath || safePath === "/" || safePath === "/auth") {
    return getDashboardPathForRole(role);
  }

  if (safePath === "/profile" || safePath.startsWith("/profile/") || safePath === "/account") {
    return getProfilePathForRole(role);
  }

  return isRolePanelPath(role, safePath) ? safePath : getDashboardPathForRole(role);
}
