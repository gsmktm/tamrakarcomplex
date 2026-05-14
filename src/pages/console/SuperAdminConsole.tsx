import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Settings, 
  ShieldCheck, 
  Database, 
  Users, 
  Store, 
  FileText, 
  MessageSquare, 
  BarChart3,
  ChevronRight,
  CreditCard,
  Lock,
  Globe
} from "lucide-react";

const PLATFORM_CONTROLS = [
  {
    title: "Core System",
    items: [
      { label: "Global Settings", href: "/suadmin/settings", icon: Settings, description: "Manage platform-wide configurations" },
      { label: "Permission Matrix", href: "/suadmin/staff-permissions", icon: ShieldCheck, description: "Manage staff and store permissions" },
      { label: "Database Maintenance", href: "/suadmin/maintenance", icon: Database, description: "System health and data tools" },
      { label: "Audit Logs", href: "/suadmin/audit", icon: FileText, description: "Track all administrative actions" },
    ]
  },
  {
    title: "Management",
    items: [
      { label: "User Manager", href: "/suadmin/users", icon: Users, description: "Manage all platform users" },
      { label: "Store Manager", href: "/suadmin/stores", icon: Store, description: "Approve and manage stores" },
      { label: "Subscription Plans", href: "/suadmin/subscriptions", icon: CreditCard, description: "Configure pricing and packages" },
      { label: "Content CMS", href: "/suadmin/content", icon: Globe, description: "Manage pages and dynamic content" },
    ]
  },
  {
    title: "Operations",
    items: [
      { label: "Repair Catalog", href: "/suadmin/repairs", icon: Settings, description: "Manage repair services and pricing" },
      { label: "Unlocking Services", href: "/suadmin/unlocking", icon: Lock, description: "Manage device unlocking catalog" },
      { label: "ChatBot Training", href: "/suadmin/chatbot", icon: MessageSquare, description: "Train and configure AI assistant" },
      { label: "Platform Analytics", href: "/suadmin/analytics", icon: BarChart3, description: "Deep insights into platform usage" },
    ]
  }
];

export default function SuperAdminConsole() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Command Center</h1>
        <p className="text-muted-foreground mt-2">
          Centralized control for all platform modules, users, and global settings.
        </p>
      </div>

      <div className="grid gap-8">
        {PLATFORM_CONTROLS.map((group) => (
          <div key={group.title} className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60 px-1">
              {group.title}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {group.items.map((item) => (
                <Link key={item.href} to={item.href}>
                  <Card className="h-full hover:shadow-md transition-all cursor-pointer group border-muted/60">
                    <CardHeader className="pb-2">
                      <div className="rounded-lg bg-primary/5 p-2 w-fit group-hover:bg-primary/10 transition-colors">
                        <item.icon className="h-5 w-5 text-primary" />
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
