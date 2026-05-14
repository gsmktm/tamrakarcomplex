import { Navigate, generatePath, useParams } from "react-router-dom";

interface ParamRouteRedirectProps {
  to: string;
}

export function ParamRouteRedirect({ to }: ParamRouteRedirectProps) {
  const params = useParams();
  const resolved = generatePath(to, params as Record<string, string>);

  return <Navigate to={resolved} replace />;
}
