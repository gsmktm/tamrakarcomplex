import { Navigate, useLocation } from "react-router-dom";

export function WildcardRedirect({ from, to }: { from: string; to: string }) {
  const location = useLocation();
  const suffix = location.pathname.startsWith(from) ? location.pathname.slice(from.length) : "";
  return <Navigate to={`${to}${suffix}${location.search}`} replace />;
}
