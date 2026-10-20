import { useMemo, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { ArrowUpRight, ExternalLink, LayoutDashboard, LogOut, Menu, Store } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getFilteredMenu } from "@/lib/permissions";
import type { AppRole } from "@/lib/permissions";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { AdminGlobalSearch } from "@/components/admin/AdminGlobalSearch";

type MenuGroups = ReturnType<typeof getFilteredMenu>;

interface StoreNavigationProps {
  groups: MenuGroups;
  query: string;
  onQueryChange: (value: string) => void;
  currentPath: string;
  onNavigate?: () => void;
  onSignOut: () => void;
}

/**
 * Defined outside StoreAdminLayout to preserve input focus on every keystroke.
 * Recreating a nested React component during parent renders remounts the input.
 */
function StoreNavigation({
  groups,
  query,
  onQueryChange,
  currentPath,
  onNavigate,
  onSignOut,
}: StoreNavigationProps) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-[#0c1b32] text-white">
      <div className="border-b border-white/10 px-5 py-6">
        <Link to="/storeadmin" onClick={onNavigate} className="group flex items-center gap-3" aria-label="Merchant dashboard">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#315cff] shadow-lg shadow-blue-950/30">
            <Store className="h-5 w-5 text-white" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="font-display text-[16px] font-bold tracking-tight">Tamrakar Complex</p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#efd39e]">Merchant workspace</p>
          </div>
        </Link>
      </div>

      <div className="space-y-3 border-b border-white/10 p-4">
        <div className="rounded-xl bg-white p-1 text-slate-900">
          <AdminGlobalSearch />
        </div>
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Find a workspace page..."
          aria-label="Filter merchant navigation"
          className="h-11 rounded-xl border-white/15 bg-white/10 text-white placeholder:text-slate-400 focus-visible:ring-[#9eb9ff]"
        />
      </div>

      <nav aria-label="Store administration" className="min-h-0 flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {groups.map((group) => (
          <div key={group.title} className="space-y-2">
            <h2 className="px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
              {group.title}
            </h2>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = currentPath === item.href ||
                  (item.href !== "/storeadmin" && currentPath.startsWith(item.href + "/"));
                return (
                  <li key={item.href}>
                    <Link
                      to={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300",
                        active
                          ? "bg-[#315cff] text-white shadow-md shadow-blue-950/25"
                          : "text-slate-300 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                      <span className="min-w-0 truncate">{item.label}</span>
                      {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#efd39e]" aria-hidden="true" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        {groups.length === 0 && (
          <p role="status" className="px-3 py-5 text-sm leading-relaxed text-slate-300">
            No workspace pages match “{query.trim()}”.
          </p>
        )}
      </nav>

      <div className="space-y-2 border-t border-white/10 p-4">
        <Link
          to="/stores"
          onClick={onNavigate}
          className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-slate-200 hover:bg-white/10"
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          Browse store directory
          <ArrowUpRight className="ml-auto h-4 w-4 opacity-60" aria-hidden="true" />
        </Link>
        <button
          type="button"
          onClick={onSignOut}
          className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-slate-200 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-300"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sign out
        </button>
      </div>
    </div>
  );
}

export default function StoreAdminLayout() {
  const location = useLocation();
  const { signOut } = useAuth();
  const { storeAdminPermissions, storeAdminPermissionsLoaded } = usePermissions();
  const [navQuery, setNavQuery] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const panelRole: AppRole = "storeadmin";
  const effectiveStorePerms = storeAdminPermissionsLoaded ? storeAdminPermissions : undefined;
  const menuGroups = useMemo(
    () => getFilteredMenu(panelRole, null, effectiveStorePerms),
    [panelRole, effectiveStorePerms]
  );
  const filteredGroups = useMemo(() => {
    const needle = navQuery.trim().toLowerCase();
    if (!needle) return menuGroups;
    return menuGroups.map((group) => ({
      ...group,
      items: group.items.filter((item) => item.label.toLowerCase().includes(needle)),
    })).filter((group) => group.items.length > 0);
  }, [menuGroups, navQuery]);

  const activePage = menuGroups.flatMap((group) => group.items).find(
    (item) => location.pathname === item.href ||
      (item.href !== "/storeadmin" && location.pathname.startsWith(item.href + "/"))
  );

  const sharedNavigation = {
    groups: filteredGroups,
    query: navQuery,
    onQueryChange: setNavQuery,
    currentPath: location.pathname,
    onSignOut: () => { void signOut(); },
  };

  return (
    <div className="flex min-h-screen bg-[#f5f7fc] dark:bg-[#0b1424]">
      <aside className="fixed inset-y-0 left-0 hidden w-72 flex-col border-r border-[#1c3453] md:flex">
        <StoreNavigation {...sharedNavigation} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col md:pl-72">
        <header className="sticky top-0 z-30 border-b border-border bg-background/95 shadow-sm shadow-slate-900/[0.02] backdrop-blur-xl">
          <div className="mx-auto flex min-h-20 max-w-[1500px] items-center justify-between gap-4 px-4 md:px-8">
            <div className="flex min-w-0 items-center gap-4">
              <div className="md:hidden">
                <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon" aria-label="Open merchant navigation">
                      <Menu className="h-5 w-5" aria-hidden="true" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-72 border-none p-0">
                    <StoreNavigation {...sharedNavigation} onNavigate={() => setMobileNavOpen(false)} />
                  </SheetContent>
                </Sheet>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary sm:flex">
                  <LayoutDashboard className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Merchant workspace</p>
                  <h1 className="truncate text-lg font-bold tracking-tight text-foreground">
                    {activePage?.label ?? "Store Dashboard"}
                  </h1>
                </div>
              </div>
            </div>
            <Button variant="outline" className="h-10 gap-2 rounded-xl" asChild>
              <Link to="/stores" aria-label="Browse public store directory">
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">View directory</span>
              </Link>
            </Button>
          </div>
        </header>

        <main id="main-content" tabIndex={-1} className="flex-1 px-4 py-7 md:px-8 md:py-10">
          <div className="mx-auto max-w-[1420px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
