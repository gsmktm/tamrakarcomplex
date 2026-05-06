import { useHomepageSettings } from "@/hooks/useHomepageSettings";
import { Users, Store, TrendingUp, BadgeCheck, Globe } from "lucide-react";

export const HomeTrustStats = () => {
  const { data: settings } = useHomepageSettings();
  const stats = settings?.trust_stats || {
    stores: "250+",
    monthly_flow: "100K+",
    services: "Buy / Sell / Repair / Exchange",
    network: "Verified Store Network",
    hub: "Nepal Mobile Market Hub"
  };

  const items = [
    { label: "Target Mobile Stores", value: stats.stores, icon: Store, color: "text-blue-600 bg-blue-50" },
    { label: "Monthly Mobile Flow", value: stats.monthly_flow, icon: TrendingUp, color: "text-green-600 bg-green-50" },
    { label: stats.network, value: "Verified", icon: BadgeCheck, color: "text-purple-600 bg-purple-50" },
    { label: stats.hub, value: "Nepal Hub", icon: Globe, color: "text-orange-600 bg-orange-50" },
  ];

  return (
    <section className="py-20 border-y bg-background">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {items.map((item, i) => (
            <div key={i} className="text-center space-y-4 group">
              <div className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center ${item.color} group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
                <item.icon className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-3xl font-black tracking-tight">{item.value}</h3>
                <p className="text-muted-foreground font-medium text-sm mt-1">{item.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
