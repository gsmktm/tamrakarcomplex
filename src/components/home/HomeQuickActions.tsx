import { useNavigate } from "react-router-dom";
import { 
  Smartphone, 
  Banknote, 
  RefreshCw, 
  Wrench, 
  Unlock, 
  Store,
  ShieldAlert 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const actions = [
  {
    title: "Buy New Phone",
    text: "Latest smartphones with warranty",
    icon: Smartphone,
    route: "/buy",
    color: "bg-blue-500/10 text-blue-600",
  },
  {
    title: "Sell Used Phone",
    text: "Get instant cash for your device",
    icon: Banknote,
    route: "/sell-your-phone",
    color: "bg-green-500/10 text-green-600",
  },
  {
    title: "Exchange Phone",
    text: "Upgrade to your dream phone",
    icon: RefreshCw,
    route: "/exchange-your-phone",
    color: "bg-purple-500/10 text-purple-600",
  },
  {
    title: "Repair Phone",
    text: "Expert screen & battery fix",
    icon: Wrench,
    route: "/repair",
    color: "bg-orange-500/10 text-orange-600",
  },
  {
    title: "Unlock / Software",
    text: "iCloud, Network & OS service",
    icon: Unlock,
    route: "/unlocking",
    color: "bg-red-500/10 text-red-600",
  },
  {
    title: "Diagnostics",
    text: "Identify hardware & software issues",
    icon: ShieldAlert,
    route: "/repair#diagnostics-section",
    color: "bg-amber-500/10 text-amber-600",
  },
  {
    title: "Store Directory",
    text: "Find 250+ stores in Nepal",
    icon: Store,
    route: "/stores",
    color: "bg-teal-500/10 text-teal-600",
  },
];

export const HomeQuickActions = () => {
  const navigate = useNavigate();

  return (
    <section className="py-12 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {actions.map((action) => (
            <Card key={action.title} className="group hover:shadow-lg transition-all border-none bg-background">
              <CardContent className="p-6 flex items-start gap-4">
                <div className={`p-4 rounded-2xl ${action.color} group-hover:scale-110 transition-transform`}>
                  <action.icon className="h-8 w-8" />
                </div>
                <div className="flex-1 space-y-1">
                  <h3 className="font-bold text-lg">{action.title}</h3>
                  <p className="text-sm text-muted-foreground">{action.text}</p>
                  <Button 
                    variant="link" 
                    className="p-0 h-auto text-primary font-semibold group-hover:translate-x-1 transition-transform"
                    onClick={() => navigate(action.route)}
                  >
                    Get Started →
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
