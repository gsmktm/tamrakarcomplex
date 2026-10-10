import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  ShieldAlert,
  LogOut,
  Menu,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Users,
  Search,
  Bell,
  User,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { getFilteredMenu } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export default function SuperAdminLayout() {
  const location = useLocation();
  const { user, role, signOut } = useAuth();
  const { permissions } = usePermissions();
  const [navQuery, setNavQuery] = useState("");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const menuGroups = useMemo(
    () => getFilteredMenu("suadmin", role === "suadmin" ? permissions : null),
    [role, permissions]
  );

  const filteredGroups = useMemo(() => {
    const q = navQuery.trim().toLowerCase();
    if (!q) return menuGroups;
    return menuGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          item.label.toLowerCase().includes(q)
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [menuGroups, navQuery]);

  const sectionAliases = useMemo<Record<string, string[]>>(() => ({
    "/suadmin": ["/suadmin", "/suadmin/me"],
    "/suadmin/team-access": ["/suadmin/team-access", "/suadmin/staff-admins", "/suadmin/staff-permissions", "/suadmin/staff-tasks", "/suadmin/staff-performance"],
    "/suadmin/customers": ["/suadmin/customers", "/suadmin/users", "/suadmin/user-rewards", "/suadmin/user-risk"],
    "/suadmin/operations": ["/suadmin/operations", "/suadmin/catalog", "/suadmin/master-data", "/suadmin/brands", "/suadmin/products", "/suadmin/price-list", "/suadmin/price-list-simple", "/suadmin/emi-plans", "/suadmin/device-verification", "/suadmin/commerce", "/suadmin/orders", "/suadmin/leads", "/suadmin/listings", "/suadmin/exchanges", "/suadmin/campaigns", "/suadmin/service-desk", "/suadmin/repairs", "/suadmin/unlocking", "/suadmin/valuation"],
    "/suadmin/store-network": ["/suadmin/store-network", "/suadmin/stores", "/suadmin/store-applications", "/suadmin/store-admins", "/suadmin/store-admin-permissions", "/suadmin/store-admin-tasks", "/suadmin/store-staff"],
    "/suadmin/billing": ["/suadmin/billing", "/suadmin/payouts", "/suadmin/subscriptions"],
    "/suadmin/publishing": ["/suadmin/publishing", "/suadmin/articles", "/suadmin/guides", "/suadmin/content"],
    "/suadmin/engagement": ["/suadmin/engagement", "/suadmin/messages", "/suadmin/chatbot", "/suadmin/polls"],
    "/suadmin/growth": ["/suadmin/growth", "/suadmin/analytics", "/suadmin/seo"],
    "/suadmin/system": ["/suadmin/system", "/suadmin/console", "/suadmin/audit", "/suadmin/maintenance", "/suadmin/health", "/suadmin/settings"],
  }), []);

  const isItemActive = useCallback((href: string) => {
    const aliases = sectionAliases[href];
    if (aliases) {
      return aliases.some((alias) => location.pathname === alias || (alias !== "/suadmin" && location.pathname.startsWith(`${alias}/`)));
    }
    return location.pathname === href || (href !== "/suadmin" && location.pathname.startsWith(href));
  }, [location.pathname, sectionAliases]);

  // Derive current page label + section for topbar breadcrumb
  const { currentLabel, currentSection } = useMemo(() => {
    for (const group of menuGroups) {
      for (const item of group.items) {
        if (isItemActive(item.href)) {
          return { currentLabel: item.label, currentSection: group.title };
        }
      }
    }
    return { currentLabel: "Dashboard", currentSection: "Command Center" };
  }, [menuGroups, isItemActive]);

  const isDuplicateCrumb = currentSection === currentLabel;

  useEffect(() => {
    setOpenGroups((current) => ({
      ...current,
      "Command Center": current["Command Center"] ?? true,
      [currentSection]: true,
    }));
  }, [currentSection]);

  const userInitials = useMemo(() => {
    const name =
      user?.user_metadata?.full_name ||
      user?.email ||
      "SA";
    return name
      .split(/\s+/)
      .map((w: string) => w[0]?.toUpperCase())
      .slice(0, 2)
      .join("");
  }, [user]);

  const NavContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <div className="flex flex-col h-full">
      {/* Sidebar header */}
      <div className="px-5 py-4 border-b">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <ShieldAlert className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-base leading-none">Super Admin</h1>
            <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider">
              System Control
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pt-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={navQuery}
            onChange={(e) => setNavQuery(e.target.value)}
            placeholder="Search menu..."
            aria-label="Filter super administration navigation"
            className="h-9 pl-8 rounded-xl bg-muted/40 text-sm"
          />
        </div>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1 scrollbar-hide">
        {filteredGroups.map((group) => {
          const hasActiveItem = group.items.some((item) => isItemActive(item.href));
          const isOpen = navQuery.trim()
            ? true
            : (openGroups[group.title] ?? (group.title === "Command Center" || hasActiveItem));

          if (group.items.length === 1) {
            const item = group.items[0];
            const Icon = item.icon;
            const isActive = isItemActive(item.href);

            return (
              <Link
                key={group.title}
                to={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-150",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{group.title}</span>
              </Link>
            );
          }

          return (
            <Collapsible
              key={group.title}
              open={isOpen}
              onOpenChange={(open) =>
                setOpenGroups((current) => ({ ...current, [group.title]: open }))
              }
              className="rounded-lg"
            >
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold uppercase tracking-[0.1em] transition-colors",
                    hasActiveItem
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 transition-transform",
                      !isOpen && "-rotate-90"
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate">{group.title}</span>
                  <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-semibold">
                    {group.items.length}
                  </Badge>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ul className="mt-1 space-y-0.5 pb-2 pl-2">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = isItemActive(item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          to={item.href}
                          onClick={onNavigate}
                          className={cn(
                            "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                            isActive
                              ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                          )}
                        >
                          <Icon className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
        {filteredGroups.length === 0 && (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            No navigation items match “{navQuery.trim()}”.
          </p>
        )}
      </nav>

      {/* Sidebar footer */}
      <div className="p-3 border-t space-y-1">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground"
          onClick={() => signOut()}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 border-r border-border bg-background md:flex md:flex-col fixed inset-y-0">
        <NavContent />
      </aside>

      <div className="flex flex-1 flex-col md:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex items-center justify-between px-4 py-3 md:px-6">
            {/* Left: mobile menu + breadcrumb */}
            <div className="flex items-center gap-3">
              <div className="md:hidden">
                <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon" className="h-8 w-8">
                      <Menu className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-64 p-0">
                    <NavContent onNavigate={() => setMobileNavOpen(false)} />
                  </SheetContent>
                </Sheet>
              </div>

              {/* Breadcrumb */}
              <nav className="flex items-center gap-1.5 text-sm">
                {!isDuplicateCrumb && (
                  <>
                    <span className="text-muted-foreground hidden sm:inline">
                      {currentSection}
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 hidden sm:inline" />
                  </>
                )}
                <span className="font-semibold text-foreground">
                  {currentLabel}
                </span>
              </nav>
            </div>

            {/* Right: panel switcher + actions + user */}
            <div className="flex items-center gap-2">
              {/* Panel switcher */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs font-medium hidden sm:flex"
                  >
                    <ShieldAlert className="h-3.5 w-3.5 text-primary" />
                    Super Admin
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem disabled className="text-xs font-semibold text-muted-foreground">
                    Switch Panel
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/staffadmin" className="flex items-center gap-2 cursor-pointer">
                      <Users className="h-3.5 w-3.5" />
                      Staff Admin
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Live site link */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                asChild
                title="View Live Site"
              >
                <Link to="/" target="_blank">
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </Button>

              {/* Notifications are not connected to a backend feed yet; keep the affordance truthful. */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 relative"
                aria-label="Notifications unavailable"
                disabled
                title="Notifications are not configured"
              >
                <Bell className="h-4 w-4" />
              </Button>

              {/* User menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-8 gap-2 px-2 hover:bg-secondary"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden md:inline text-xs font-medium max-w-[120px] truncate">
                      {user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Admin"}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-3 py-2 border-b">
                    <p className="text-xs font-semibold truncate">
                      {user?.user_metadata?.full_name || "Super Admin"}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {user?.email}
                    </p>
                    <Badge variant="secondary" className="mt-1 text-[9px] h-4">
                      suadmin
                    </Badge>
                  </div>
                  <DropdownMenuItem asChild>
                    <Link to="/suadmin/me" className="flex items-center gap-2 cursor-pointer">
                      <User className="h-3.5 w-3.5" />
                      My Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => signOut()}
                    className="text-destructive focus:text-destructive flex items-center gap-2"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
