import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

export default function StoreRedirect() {
  const { id, slug } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const target = id || slug;
    if (target) {
      // Check if it's a UUID
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(target);
      if (isUuid) {
        navigate(`/stores/${target}`, { replace: true });
      } else {
        // If not a UUID, it's a slug or custom ID
        navigate(`/stores/${target}`, { replace: true });
      }
    }
  }, [id, slug, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <p className="text-muted-foreground font-medium">Redirecting to store...</p>
      </div>
    </div>
  );
}
