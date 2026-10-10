import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Smartphone, Banknote, Wrench, Store, MessageCircle } from "lucide-react";
import { readAppSettings } from "@/lib/siteSettings";

export const MobileStickyCTA = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(readAppSettings());

  useEffect(() => {
    const sync = () => setSettings(readAppSettings());
    window.addEventListener("app-settings-update", sync);
    return () => window.removeEventListener("app-settings-update", sync);
  }, []);

  const whatsappDigits = (settings.contact_info.whatsapp || "").replace(/[^0-9]/g, "");
  const actions = [
    { label: "Price", icon: Smartphone, href: "/mobile-price" },
    { label: "Sell", icon: Banknote, href: "/sell-your-phone" },
    { label: "Repair", icon: Wrench, href: "/repair" },
    { label: "Stores", icon: Store, href: "/stores" },
    ...(whatsappDigits
      ? [{ label: "Chat", icon: MessageCircle, href: `https://wa.me/${whatsappDigits}` }]
      : []),
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/80 backdrop-blur-lg border-t pb-safe">
      <div className="flex items-center justify-around h-16">
        {actions.map((action) => (
          <button
            key={action.label}
            className="flex flex-col items-center justify-center gap-1 w-full h-full text-muted-foreground hover:text-primary transition-colors"
            onClick={() => {
              if (action.href.startsWith("http")) {
                window.open(action.href, "_blank");
              } else {
                navigate(action.href);
              }
            }}
          >
            <action.icon className="h-5 w-5" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
