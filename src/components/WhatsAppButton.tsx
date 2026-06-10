import React, { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { readAppSettings } from "@/lib/siteSettings";
import { cn } from "@/lib/utils";

export const WhatsAppButton = () => {
  const [settings, setSettings] = useState(readAppSettings());

  useEffect(() => {
    const handleSettingsUpdate = () => {
      setSettings(readAppSettings());
    };

    window.addEventListener("app-settings-update", handleSettingsUpdate);
    return () => window.removeEventListener("app-settings-update", handleSettingsUpdate);
  }, []);

  if (!settings.features.enable_whatsapp || !settings.contact_info.whatsapp) {
    return null;
  }

  const whatsappNumber = settings.contact_info.whatsapp.replace(/[^0-9]/g, "");
  const whatsappUrl = `https://api.whatsapp.com/send?phone=${whatsappNumber}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-all hover:scale-110 active:scale-95"
      )}
      aria-label="Chat on WhatsApp"
    >
      <MessageCircle className="h-8 w-8" />
      <span className="absolute -top-1 -right-1 flex h-4 w-4">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
        <span className="relative inline-flex h-4 w-4 rounded-full bg-green-500"></span>
      </span>
    </a>
  );
};
