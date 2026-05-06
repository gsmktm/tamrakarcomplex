import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Package, 
  CreditCard, 
  Wrench, 
  ShoppingBag, 
  Store, 
  FileText, 
  MessageSquare, 
  BarChart3,
  ChevronRight,
  Unlock,
  Users,
  Settings
} from "lucide-react";

const OPERATION_MODULES = [
  {
    title: "Catalog & Sales",
    items: [
      { label: "Products", href: "/staffadmin/products", icon: Package, description: "Manage global product catalog" },
      { label: "Orders", href: "/staffadmin/orders", icon: CreditCard, description: "Review and process platform orders" },
      { label: "Listings", href: "/staffadmin/listings", icon: ShoppingBag, description: "Moderate community marketplace listings" },
    ]
  },
  {
    title: "Services",
    items: [
      { label: "Repairs", href: "/staffadmin/repairs", icon: Wrench, description: "Manage repair requests and status" },
      { label: "Unlocking", href: "/staffadmin/unlocking", icon: Unlock, description: "Process device unlocking requests" },
    ]
  },
  {
    title: "Content & Communication",
    items: [
      { label: "Articles & News", href: "/staffadmin/articles", icon: FileText, description: "Publish news and blog posts" },
      { label: "Guides & FAQ", href: "/staffadmin/guides", icon: FileText, description: "Manage help center content" },
      { label: "Messages", href: "/staffadmin/messages", icon: MessageSquare, description: "Handle customer inquiries" },
      { label: "Polls", href: "/staffadmin/polls", icon: BarChart3, description: "Manage community engagement polls" },
    ]
  },
  {
    title: "Platform Directory",
    items: [
      { label: "Stores", href: "/staffadmin/stores", icon: Store, description: "Directory of all registered stores" },
      { label: "Users", href: "/staffadmin/users", icon: Users, description: "Platform user directory" },
      { label: "System Themes", href: "/staffadmin/themes", icon: Settings, description: "Manage site appearance assets" },
    ]
  }
];

export default function StaffAdminConsole() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Operations Console</h1>
        <p className="text-muted-foreground mt-2">
          Manage platform modules and operational workflows.
        </p>
      </div>

      <div className="grid gap-8">
        {OPERATION_MODULES.map((group) => (
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
