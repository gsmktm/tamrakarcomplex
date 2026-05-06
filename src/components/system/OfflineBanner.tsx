import { useEffect, useState } from "react";

export const OfflineBanner = () => {
  const [online, setOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  if (online) return null;
  return (
    <div className="fixed top-0 inset-x-0 z-50 bg-destructive text-destructive-foreground text-sm text-center py-2">
      You are offline. Some features are unavailable.
    </div>
  );
};
