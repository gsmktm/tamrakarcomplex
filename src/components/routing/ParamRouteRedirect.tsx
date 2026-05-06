import { Navigate, generatePath, useParams } from "react-router-dom";

interface ParamRouteRedirectProps {
  to: string;
}

export function ParamRouteRedirect({ to }: ParamRouteRedirectProps) {
  const params = useParams();
  const resolved = generatePath(to, params as Record<string, string>);

  // #region agent log
  fetch('http://127.0.0.1:7814/ingest/43fe6348-5dce-42cf-90f3-865a45a915cd',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7b7101'},body:JSON.stringify({sessionId:'7b7101',runId:'initial',hypothesisId:'H7',location:'src/components/routing/ParamRouteRedirect.tsx:render',message:'Param route redirect evaluated',data:{to,resolved,params},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  return <Navigate to={resolved} replace />;
}
