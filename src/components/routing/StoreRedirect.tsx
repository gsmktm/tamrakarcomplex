import { Navigate, useLocation, useParams } from "react-router-dom";
import { legacyDetailDestination } from "@/lib/legacyDetailRoutes";

/** Legacy one-segment store URLs redirect without a blank waiting screen. */
export default function StoreRedirect() {
  const { id, slug } = useParams<{ id?: string; slug?: string }>();
  const location = useLocation();
  return (
    <Navigate
      to={legacyDetailDestination("/stores", id || slug, location.search, location.hash)}
      replace
    />
  );
}
