import { useEffect } from "react";
import { readAppSettings } from "@/lib/siteSettings";

export const DynamicFavicon = () => {
  useEffect(() => {
    const updateFavicon = () => {
      const settings = readAppSettings();
      const faviconUrl = settings.site_info.favicon_url;
      
      if (faviconUrl) {
        let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
        
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.getElementsByTagName('head')[0].appendChild(link);
        }
        
        link.href = faviconUrl;
      }
    };

    updateFavicon();
    
    window.addEventListener("app-settings-update", updateFavicon);
    return () => window.removeEventListener("app-settings-update", updateFavicon);
  }, []);

  return null;
};
