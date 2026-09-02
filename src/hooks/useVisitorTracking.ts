import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "tamrakar_visitor_session_id";

export function useVisitorTracking() {
  const location = useLocation();
  const lastPathname = useRef<string | null>(null);

  useEffect(() => {
    // Only track if the pathname has changed (to avoid tracking query param changes if not needed)
    if (lastPathname.current === location.pathname) return;
    lastPathname.current = location.pathname;

    const logVisit = async () => {
      try {
        // Get or create session ID
        let sessionId = localStorage.getItem(SESSION_KEY);
        if (!sessionId) {
          sessionId = crypto.randomUUID();
          localStorage.setItem(SESSION_KEY, sessionId);
        }

        // Fetch location data (optional but requested)
        let geoData = {
          ip: "unknown",
          country_name: "Unknown",
          city: "Unknown",
          region: "Unknown",
        };

        try {
          const GEO_CACHE_KEY = "tamrakar_geo_cache";
          const cached = sessionStorage.getItem(GEO_CACHE_KEY);
          if (cached) {
            geoData = JSON.parse(cached);
          } else {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);
            const geoResponse = await fetch("https://ipapi.co/json/", {
              signal: controller.signal,
              mode: 'cors',
              credentials: 'omit'
            }).catch(() => null);
            clearTimeout(timeoutId);
            if (geoResponse && geoResponse.ok) {
              const data = await geoResponse.json();
              geoData = {
                ip: data.ip || "unknown",
                country_name: data.country_name || "Unknown",
                city: data.city || "Unknown",
                region: data.region || "Unknown",
              };
              sessionStorage.setItem(GEO_CACHE_KEY, JSON.stringify(geoData));
            }
          }
        } catch (e) {
          // silent
        }

        // Log to Supabase via RPC
        await supabase.rpc("log_visitor", {
          p_ip_address: geoData.ip,
          p_user_agent: navigator.userAgent,
          p_url: window.location.href,
          p_referrer: document.referrer || "direct",
          p_country: geoData.country_name,
          p_city: geoData.city,
          p_region: geoData.region,
          p_session_id: sessionId,
        });
      } catch (error) {
        console.error("Visitor tracking error:", error);
      }
    };

    logVisit();
  }, [location.pathname]);
}
