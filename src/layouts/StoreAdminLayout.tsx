import { useMemo, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  Store,
  LogOut,
  Menu,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getFilteredMenu } from "@/lib/permissions";
import type { AppRole } from "@/lib/permissions";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { AdminGlobalSearch } from "@/components/admin/AdminGlobalSearch";

export default function StoreAdminLayout() {
  const location = useLocation();
  const { signOut, role } = useAuth();
  const { permissions, storeAdminPermissions, storeAdminPermissionsLoaded } = usePermissions();
  const [navQuery, setNavQuery] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const panelRole: AppRole = "storeadmin";
  // Once grants are loaded, filter menu items by the granted module keys;
  // while loading, pass undefined so gated items stay visible (no flash).
  const effectiveStorePerms = panelRole === "storeadmin" && storeAdminPermissionsLoaded
    ? storeAdminPermissions
    : undefined;
  const menuGroups = useMemo(
    () => getFilteredMenu(
      panelRole,
      panelRole === "staffadmin" && role === "staffadmin" ? permissions : null,
      effectiveStorePerms
    ),
    [panelRole, role, permissions, effectiveStorePerms]
  );

  const filteredGroups = useMemo(() => {
    const q = navQuery.trim().toLowerCase();
    if (!q) return menuGroups;
    return menuGroups.map(group => ({
      ...group,
      items: group.items.filter(item => item.label.toLowerCase().includes(q))
    })).filter(group => group.items.length > 0);
  }, [menuGroups, navQuery]);

  const NavContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <div className="flex flex-col h-full">
      <div className="px-6 py-5 border-b">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-green-500/10 p-2">
            <Store className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none">Store Admin</h1>
            <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">Merchant Panel</p>
          </div>
        </div>
      </div>

      <div className="p-4 border-b">
        <AdminGlobalSearch />
        <Input
          value={navQuery}
          onChange={(event) => setNavQuery(event.target.value)}
          placeholder="Filter navigation..."
          aria-label="Filter store administration navigation"
          className="mt-3 h-9 rounded-xl bg-muted/40"
        />
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-6 scrollbar-hide">
        {filteredGroups.map((group) => (
          <div key={group.title} className="space-y-2">
            <h3 className="px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
              {group.title}
            </h3>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href || (item.href !== "/storeadmin" && location.pathname.startsWith(`${item.href}/`));
                return (
                  <li key={item.href}>
                    <Link
                      to={item.href}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-green-600 text-white shadow-lg shadow-green-600/25"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        {filteredGroups.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            No navigation items match “{navQuery.trim()}”.
          </p>
        )}
      </nav>

      <div className="p-4 border-t">
        <Button variant="ghost" className="w-full justify-start gap-2" onClick={() => signOut()}>
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Desktop Sidebar */}
      <aside className="hidden w-72 border-r border-border bg-background md:flex md:flex-col fixed inset-y-0">
        <NavContent />
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col md:pl-72">
        <header className="sticky top-0 z-30 border-b border-border bg-background/92 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex items-center justify-between px-4 py-4 md:px-8">
            <div className="flex items-center gap-4">
              <div className="md:hidden">
                <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-72 p-0">
                    <NavContent onNavigate={() => setMobileNavOpen(false)} />
                  </SheetContent>
                </Sheet>
              </div>
              <h2 className="text-sm font-semibold text-muted-foreground md:text-base">
                Store Console
              </h2>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" asChild title="View Store Page">
                <Link to="/stores" target="_blank">
                  <ExternalLink className="h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
