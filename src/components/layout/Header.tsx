import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { BadgeCheck, Heart, MapPin, Menu, MessageCircle, Search, X } from "lucide-react";
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
      {/* ── Trust bar ──────────────────────────────────────────────────────── */}
      <div className="bg-navy text-white/70 text-[11px] font-medium border-b border-white/10 hidden md:block">
        <div className="container flex items-center justify-between h-8 gap-4">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-gold" aria-hidden />
              New Road, Kathmandu - Nepal's Mobile Mega Market
            </span>
            <span className="text-white/30">|</span>
            <span className="inline-flex items-center gap-1.5">
              <BadgeCheck className="h-3.5 w-3.5 text-gold" aria-hidden />
              Verified Stores Only
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/stores" className="hover:text-gold transition-colors">Find Stores</a>
            <span className="text-white/30">|</span>
            <a href="/repair" className="hover:text-gold transition-colors">Book Repair</a>
            <span className="text-white/30">|</span>
            <a href="/sell-your-phone" className="hover:text-gold transition-colors">Sell Phone</a>
          </div>
        </div>
      </div>

      {/* ── Main bar ─────────────────────────────────────────────────────── */}
      <div className="border-b border-white/10 bg-navy shadow-navy">
        <div className="container flex h-14 items-center gap-4">
          {/* Wordmark */}
          <Link
            to="/"
            className="flex shrink-0 items-center gap-2.5 pressable"
            aria-label="Tamrakar Complex home"
          >
            <div className="flex h-8 w-8 items-center justify-center bg-white/10 border border-white/20 rounded-md">
              <img src={logo} alt="" className="h-full w-full object-contain p-0.5" />
            </div>
            <span className="hidden font-display text-base font-bold tracking-tight sm:block text-white">
              Tamrakar<span className="text-gold">.</span>
            </span>
          </Link>

          {/* Search bar — desktop */}
          <button
            onClick={() => setIsSearchDialogOpen(true)}
            className="hidden lg:flex flex-1 max-w-md ml-4 items-center gap-2 h-9 px-3 rounded-lg border border-white/20 bg-white/8 text-sm text-white/50 hover:bg-white/12 hover:border-white/30 transition-all pressable"
            aria-label="Open search"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            <Search className="h-3.5 w-3.5 shrink-0 text-white/40" />
            <span className="truncate flex-1 text-left text-white/40">Search iPhone, Samsung, MacBook, repair…</span>
            <kbd className="hidden xl:inline-flex border border-white/20 bg-white/10 rounded px-1.5 py-0.5 text-[10px] font-medium text-white/40">
              ⌘K
            </kbd>
          </button>

          {/* Actions */}
          <div className="flex items-center gap-1.5 ml-auto">
            {/* Mobile search */}
            <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9 text-white/70 hover:text-white hover:bg-white/10" onClick={() => setIsSearchDialogOpen(true)}>
              <Search className="h-4 w-4" />
            </Button>

            <ThemeToggle />
            <CartSheet />

            {user && <NotificationBell />}

            {/* Wishlist */}
            <Button variant="ghost" size="icon" className="relative hidden md:flex h-9 w-9 text-white/70 hover:text-white hover:bg-white/10" asChild>
              <Link to="/wishlist" aria-label="Wishlist">
                <Heart className="h-4 w-4" />
                {wishlistCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[9px] font-bold text-navy">
                    {wishlistCount > 9 ? "9+" : wishlistCount}
                  </span>
                )}
              </Link>
            </Button>

            {/* WhatsApp */}
            <a
              href={`https://api.whatsapp.com/send?phone=${contactInfo.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex h-9 w-9 items-center justify-center rounded-lg bg-[#25D366] text-white hover:bg-[#1aab56] transition-colors pressable"
              aria-label="WhatsApp"
            >
              <MessageCircle className="h-4 w-4" />
            </a>

            {/* Gold CTA */}
            <Button
              size="sm"
              className="hidden xl:inline-flex h-8 text-xs font-bold rounded-lg bg-gold text-navy hover:bg-gold/90 shadow-gold pressable"
              asChild
            >
              <Link to="/sell-your-phone">Sell Phone</Link>
            </Button>

            {/* Admin console */}
            {user && (role === "suadmin" || role === "staffadmin" || isStoreAdminUser) && (
              <Button
                size="sm"
                className="hidden xl:inline-flex h-8 text-xs font-semibold rounded-lg bg-white/10 text-white border border-white/20 hover:bg-white/20 pressable"
                asChild
              >
                <Link
                  to={
                    role === "suadmin"
                      ? "/suadmin/console"
                      : role === "staffadmin"
                        ? "/staffadmin/console"
                        : "/storeadmin/console"
                  }
                >
                  Console
                </Link>
              </Button>
            )}

            <UserMenuDropdown user={user} onSignOut={handleSignOut} />

            {/* Mobile menu toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-9 w-9 text-white/70 hover:text-white hover:bg-white/10"
              onClick={() => setIsMobileMenuOpen((open) => !open)}
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
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
