import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Store, 
  Users, 
  Calendar, 
  Settings, 
  ChevronRight,
  User as UserIcon,
  CreditCard,
  Bell,
  BarChart3,
  Shield,
  Smartphone,
  Wrench,
  Unlock,
  MessageSquare,
  Package,
  ArrowUpRight
} from "lucide-react";

const STORE_CONTROLS = [
  {
    title: "Store Operations",
    items: [
      { label: "Products & Stock", href: "/storeadmin/products", icon: Smartphone, description: "Manage mobile phones and accessories" },
      { label: "Repair Requests", href: "/storeadmin/repairs", icon: Wrench, description: "Process incoming device repairs" },
      { label: "Unlock Requests", href: "/storeadmin/unlocking", icon: Unlock, description: "Manage software and carrier unlocks" },
      { label: "Leads & Exchanges", href: "/storeadmin/leads", icon: ArrowUpRight, description: "Trade-ins and valuation leads" },
      { label: "Order History", href: "/storeadmin/orders", icon: Package, description: "View and fulfill ecommerce orders" },
      { label: "Customer Messages", href: "/storeadmin/messages", icon: MessageSquare, description: "Direct inquiries from your customers" },
    ]
  },
  {
    title: "Store Configuration",
    items: [
      { label: "Store Profile", href: "/storeadmin/profile", icon: Store, description: "Manage store name, address, and logo" },
      { label: "Business Settings", href: "/storeadmin/settings", icon: Settings, description: "Hours, contact info, and policies" },
      { label: "Team Management", href: "/storeadmin/team", icon: Users, description: "Manage staff accounts and permissions" },
    ]
  },
  {
    title: "Growth & Billing",
    items: [
      { label: "My Subscription", href: "/storeadmin/my-subscription", icon: Calendar, description: "View plan, usage, and billing" },
      { label: "Store Analytics", href: "/storeadmin/analytics", icon: BarChart3, description: "Performance and sales insights" },
      { label: "Payout Settings", href: "/storeadmin/payouts", icon: CreditCard, description: "Manage how you get paid" },
    ]
  },
  {
    title: "Notifications & Security",
    items: [
      { label: "Alert Settings", href: "/storeadmin/notifications", icon: Bell, description: "Order and repair notifications" },
      { label: "Store Security", href: "/storeadmin/security", icon: Shield, description: "Access logs and security settings" },
      { label: "My Account", href: "/storeadmin/me", icon: UserIcon, description: "Manage your personal profile" },
    ]
  }
];

export default function StoreAdminConsole() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Store Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure your store profile, team, and business preferences.
        </p>
      </div>

      <div className="grid gap-8">
        {STORE_CONTROLS.map((group) => (
          <div key={group.title} className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60 px-1">
              {group.title}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {group.items.map((item) => (
                <Link key={item.href} to={item.href}>
                  <Card className="h-full hover:shadow-md transition-all cursor-pointer group border-muted/60">
                    <CardHeader className="pb-2">
                      <div className="rounded-lg bg-green-500/5 p-2 w-fit group-hover:bg-green-500/10 transition-colors">
                        <item.icon className="h-5 w-5 text-green-600" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardTitle className="text-base flex items-center justify-between">
                        {item.label}
                        <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:translate-x-1 transition-transform" />
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {item.description}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
