import type { ComponentType } from "react";
import { useMemo } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  BarChart3,
  Calendar,
  Database,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldAlert,
  Users,
  User,
  Wrench,
  Menu,
  Store,
  Package,
  CreditCard,
  FileText,
  ShoppingBag,
  MessageSquare,
  Unlock,
  Tag,
  ListTodo,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { getFilteredMenu } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { AdminGlobalSearch } from "@/components/admin/AdminGlobalSearch";

type SuperAdminNavGroup = {
  title: string;
  items: Array<{
    href: string;
    icon: ComponentType<{ className?: string }>;
    label: string;
  }>;
};

export default function SuperAdminLayout() {
  const { signOut, role } = useAuth();
  const { permissions } = usePermissions();
  const location = useLocation();

  const menuGroups = useMemo(() => getFilteredMenu(role || "suadmin", permissions), [role, permissions]);

  const NavContent = () => (
    <div className="flex h-full min-h-0 flex-col">
      <div className="p-6 border-b">
        <div className="flex items-center justify-between gap-3">
          <div className="rounded-full bg-red-500/10 p-2">
            <ShieldAlert className="h-6 w-6 text-red-500" />
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-lg">Super Admin</h2>
            <p className="text-sm text-muted-foreground">System Control Panel</p>
          </div>
          <Button variant="ghost" size="icon" asChild title="View Live Site">
            <Link to="/" target="_blank" rel="noreferrer">
              <ExternalLink className="h-5 w-5 text-muted-foreground" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="px-4 py-2 border-b">
        <AdminGlobalSearch />
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto p-4 space-y-6">
        {menuGroups.map((group) => (
          <div key={group.title}>
            <h3 className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground mb-3">
              {group.title}
            </h3>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isRoot = item.href === "/suadmin";
                const isActive = isRoot
                  ? location.pathname === item.href
                  : location.pathname === item.href || location.pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 hidden w-80 bg-card border-r lg:block">
        <NavContent />
      </div>

      {/* Mobile Header */}
      <div className="sticky top-0 z-40 lg:hidden">
        <div className="flex h-16 items-center gap-4 border-b bg-card px-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Super Admin Navigation</SheetTitle>
              </SheetHeader>
              <NavContent />
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-red-500" />
            <span className="font-semibold">Super Admin</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:pl-80">
        <main className="py-8 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
