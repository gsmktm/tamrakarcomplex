import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Heart, Menu, MessageCircle, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { isStoreAdminRole } from "@/lib/roles";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { SearchDialog } from "@/components/search/SearchDialog";
import { CartSheet } from "@/components/cart/CartSheet";
import { defaultQuickMenuItems, exploreLandingItem, siteNavigationGroups } from "@/data/siteNavigation";
import { useWishlist } from "@/hooks/useWishlist";
import { readAppSettings, readThemeSettings } from "@/lib/siteSettings";
import type { StoreThemeSettings } from "@/types/app";
import { NavigationBar } from "@/components/layout/NavigationBar";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { UserMenuDropdown } from "@/components/layout/UserMenuDropdown";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import logo from "@/assets/logo.png";

let categories = defaultQuickMenuItems;

try {
  const parsed = readThemeSettings() as StoreThemeSettings;
  if (Array.isArray(parsed.menuItems) && parsed.menuItems.length > 0) {
    categories = parsed.menuItems;
  }
} catch {
  // Ignore malformed local theme customizations and fall back to defaults.
}

const exploreItems = [
  { name: "Smartphones", description: "Latest mobile phones and prices", href: "/mobile-price" },
  { name: "Laptops", description: "Notebooks, ultrabooks, and gaming laptops", href: "/laptop-price" },
  { name: "Tablets", description: "iPad, Android tablets, and hybrid devices", href: "/buy?category=Tablets" },
  { name: "Audio", description: "Earbuds, headphones, speakers, and accessories", href: "/buy?category=Audio" },
  { name: "Smartwatches", description: "Wearables and fitness trackers", href: "/buy?category=Watch" },
  { name: "Gaming", description: "Consoles, PCs, and gaming accessories", href: "/buy?category=Gaming" },
];

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false);
  const [navItems, setNavItems] = useState(categories);
  const [contactInfo, setContactInfo] = useState(readAppSettings().contact_info);
  const { user, signOut, role } = useAuth();
  const isStoreAdminUser = isStoreAdminRole(role);
  const { count: wishlistCount } = useWishlist();
  const location = useLocation();
  const navigate = useNavigate();

  const groupedHrefs = useMemo(
    () =>
      new Set([
        "/",
        exploreLandingItem.href,
        ...siteNavigationGroups.flatMap((group) => [group.href, ...group.items.map((item) => item.href)]),
        ...exploreItems.map((item) => item.href),
      ]),
    [],
  );

  const visibleQuickItems = useMemo(
    () =>
      navItems.filter((item, index, items) => {
        const href = item.href?.trim();
        if (!href) return false;
        return items.findIndex((candidate) => candidate.href === href) === index && !groupedHrefs.has(href);
      }),
    [groupedHrefs, navItems],
  );

  const topLevelHomeItem = navItems.find((item) => item.href === "/") || { name: "Home", href: "/" };

  useEffect(() => {
    const syncMenu = () => {
      try {
        const parsed = readThemeSettings() as StoreThemeSettings;
        if (Array.isArray(parsed.menuItems) && parsed.menuItems.length > 0) {
          setNavItems(parsed.menuItems);
        }
      } catch {
        // Ignore malformed local theme customizations and preserve current menu.
      }
    };

    const syncContact = () => {
      try {
        setContactInfo(readAppSettings().contact_info);
      } catch {
        // Ignore errors
      }
    };

    syncMenu();
    syncContact();
    window.addEventListener("storage", syncMenu);
    window.addEventListener("theme-update", syncMenu);
    window.addEventListener("app-settings-update", syncContact);
    return () => {
      window.removeEventListener("storage", syncMenu);
      window.removeEventListener("theme-update", syncMenu);
      window.removeEventListener("app-settings-update", syncContact);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchDialogOpen(true);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="border-b border-border/60 bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
        <div className="container flex h-16 items-center gap-4">
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white p-1.5 shadow-glow">
              <img src={logo} alt="Tamrakar Complex" className="h-full w-full object-contain" />
            </div>
            <span className="hidden font-display text-xl font-bold sm:block">
              Tamrakar<span className="text-primary">Complex</span>
            </span>
          </Link>

          <button onClick={() => setIsSearchDialogOpen(true)} className="hidden lg:block flex-1 max-w-md ml-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <div className="flex w-full items-center gap-2 rounded-full border border-border bg-secondary/40 px-12 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-secondary/60">
                <span className="truncate">Search products, prices, stores...</span>
                <kbd className="ml-auto rounded-full border border-border/60 bg-background/70 px-2 py-0.5 text-[10px]">
                  ⌘K
                </kbd>
              </div>
            </div>
          </button>

          <div className="flex items-center gap-1.5 ml-auto">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsSearchDialogOpen(true)}>
              <Search className="h-5 w-5" />
            </Button>

            <a
              href={`https://api.whatsapp.com/send?phone=${contactInfo.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#25D366] text-white hover:bg-[#128C7E] transition-colors"
              aria-label="WhatsApp Chat"
            >
              <MessageCircle className="h-5 w-5" />
            </a>

            <ThemeToggle />
            <CartSheet />

            {user && <NotificationBell />}

            <Button variant="ghost" size="icon" className="relative hidden md:flex" asChild>
              <Link to="/wishlist" aria-label="Open wishlist">
                <Heart className="h-5 w-5" />
                {wishlistCount > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                    {wishlistCount > 9 ? "9+" : wishlistCount}
                  </span>
                ) : null}
              </Link>
            </Button>

            <Button variant="outline" size="sm" className="hidden xl:inline-flex" asChild>
              <Link to="/valuation-estimator">Get Estimate</Link>
            </Button>

            {user && (role === "suadmin" || role === "staffadmin" || isStoreAdminUser) && (
              <Button size="sm" className="hidden xl:inline-flex hero-gradient" asChild>
                <Link to={role === "suadmin" ? "/suadmin/console" : role === "staffadmin" ? "/staffadmin/console" : "/storeadmin/console"}>
                  Console
                </Link>
              </Button>
            )}

            <UserMenuDropdown user={user} onSignOut={handleSignOut} />

            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsMobileMenuOpen((open) => !open)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      <NavigationBar
        topLevelHomeItem={topLevelHomeItem}
        siteNavigationGroups={siteNavigationGroups}
        exploreLandingItem={exploreLandingItem}
        exploreItems={exploreItems}
        visibleQuickItems={visibleQuickItems}
      />

      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        topLevelHomeItem={topLevelHomeItem}
        siteNavigationGroups={siteNavigationGroups}
        exploreLandingItem={exploreLandingItem}
        exploreItems={exploreItems}
        visibleQuickItems={visibleQuickItems}
        user={user}
      />

      <SearchDialog open={isSearchDialogOpen} onOpenChange={setIsSearchDialogOpen} />
    </header>
  );
}
