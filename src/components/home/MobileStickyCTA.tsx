import { useNavigate } from "react-router-dom";
import { Smartphone, Banknote, Wrench, Store, MessageCircle } from "lucide-react";

export const MobileStickyCTA = () => {
  const navigate = useNavigate();

  const actions = [
    { label: "Price", icon: Smartphone, href: "/mobile-price" },
    { label: "Sell", icon: Banknote, href: "/sell-your-phone" },
    { label: "Repair", icon: Wrench, href: "/repair" },
    { label: "Stores", icon: Store, href: "/stores" },
    { label: "Chat", icon: MessageCircle, href: "https://wa.me/9779851091542" },
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
