import { useMemo, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { ExternalLink, LogOut, Menu, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { getFilteredMenu } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type NavGroups = ReturnType<typeof getFilteredMenu>;

interface OpsSidebarProps {
  groups: NavGroups;
  query: string;
  onQueryChange: (query: string) => void;
  pathname: string;
  onNavigate?: () => void;
  onSignOut: () => void;
}

/** Top-level identity keeps the focused search input mounted when its value changes. */
function OpsSidebar({ groups, query, onQueryChange, pathname, onNavigate, onSignOut }: OpsSidebarProps) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-[#101e35] text-white">
      <Link to="/staffadmin" onClick={onNavigate} className="flex items-center gap-3 border-b border-white/10 px-5 py-6">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#315cff]">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <p className="font-display text-base font-bold tracking-tight">Tamrakar Complex</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.17em] text-[#efd39e]">Operations center</p>
        </div>
      </Link>

      <div className="border-b border-white/10 p-4">
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Find a management page..."
          aria-label="Filter staff administration navigation"
          className="h-11 rounded-xl border-white/15 bg-white/10 text-white placeholder:text-slate-400 focus-visible:ring-[#9eb9ff]"
        />
      </div>

      <nav aria-label="Staff administration" className="min-h-0 flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {groups.map((group) => (
          <section key={group.title} aria-label={group.title} className="space-y-2">
            <h2 className="px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
              {group.title}
            </h2>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href ||
                  (item.href !== "/staffadmin" && pathname.startsWith(item.href + "/"));
                return (
                  <li key={item.href}>
                    <Link
                      to={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300",
                        active
                          ? "bg-[#315cff] text-white shadow-md shadow-blue-950/25"
                          : "text-slate-300 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                      <span className="min-w-0 truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
        {groups.length === 0 && (
          <p role="status" className="px-3 py-5 text-sm text-slate-300">
            No management pages match “{query.trim()}”.
          </p>
        )}
      </nav>

      <div className="border-t border-white/10 p-4">
        <button
          type="button"
          onClick={onSignOut}
          className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-slate-200 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-300"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
        </button>
      </div>
    </div>
  );
}

export default function StaffAdminLayout() {
  const location = useLocation();
  const { role, signOut } = useAuth();
  const { permissions } = usePermissions();
  const [navQuery, setNavQuery] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const menuGroups = useMemo(
    () => getFilteredMenu("staffadmin", role === "staffadmin" ? permissions : null),
    [role, permissions]
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
      (item.href !== "/staffadmin" && location.pathname.startsWith(item.href + "/"))
  );

  const props = {
    groups: filteredGroups,
    query: navQuery,
    onQueryChange: setNavQuery,
    pathname: location.pathname,
    onSignOut: () => { void signOut(); },
  };

  return (
    <div className="flex min-h-screen bg-[#f5f7fc] dark:bg-[#0b1424]">
      <aside className="fixed inset-y-0 left-0 hidden w-72 flex-col border-r border-[#1c3453] md:flex">
        <OpsSidebar {...props} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col md:pl-72">
        <header className="sticky top-0 z-30 border-b border-border bg-background/95 shadow-sm shadow-slate-900/[0.02] backdrop-blur-xl">
          <div className="mx-auto flex min-h-20 max-w-[1500px] items-center justify-between gap-4 px-4 md:px-8">
            <div className="flex min-w-0 items-center gap-4">
              <div className="md:hidden">
                <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon" aria-label="Open staff administration navigation">
                      <Menu className="h-5 w-5" aria-hidden="true" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-72 border-none p-0">
                    <OpsSidebar {...props} onNavigate={() => setMobileNavOpen(false)} />
                  </SheetContent>
                </Sheet>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Operations center</p>
                <h1 className="truncate text-lg font-bold tracking-tight text-foreground">
                  {activePage?.label ?? "Platform Operations"}
                </h1>
              </div>
            </div>
            <Button variant="outline" className="h-10 gap-2 rounded-xl" asChild>
              <Link to="/" aria-label="View public marketplace">
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">View marketplace</span>
              </Link>
            </Button>
          </div>
        </header>

        <main id="main-content" tabIndex={-1} className="flex-1 px-4 py-7 md:px-8 md:py-10">
          <div className="mx-auto max-w-[1420px]"><Outlet /></div>
        </main>
      </div>
    </div>
  );
}
