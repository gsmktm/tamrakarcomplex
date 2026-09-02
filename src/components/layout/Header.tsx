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
  { name: "Smartphones", description: "Latest mobile phones and prices", href: "/cat/mobiles" },
  { name: "Laptops", description: "Notebooks, ultrabooks, and gaming laptops", href: "/laptop-price" },
  { name: "Tablets", description: "iPad, Android tablets, and hybrid devices", href: "/cat/mobiles?tab=buy&category=Tablets" },
  { name: "Audio", description: "Earbuds, headphones, speakers, and accessories", href: "/cat/mobiles?tab=buy&category=Earbuds" },
  { name: "Smartwatches", description: "Wearables and fitness trackers", href: "/cat/mobiles?tab=buy&category=Smartwatches" },
  { name: "Gaming", description: "Consoles, PCs, and gaming accessories", href: "/cat/mobiles?tab=buy&category=Gaming" },
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
    () => {
      const quickItems = navItems.filter((item, index, items) => {
        const href = item.href?.trim();
        if (!href) return false;
        return items.findIndex((candidate) => candidate.href === href) === index && !groupedHrefs.has(href);
      });

      if (!quickItems.some((item) => item.href === "/mobile-price")) {
        quickItems.push({ name: "Price List", href: "/mobile-price" });
      }

      return quickItems;
    },
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
      <div className="text-[11px] font-medium hidden md:block border-b bg-[#11130F] border-white/10">
        <div className="container flex items-center justify-between h-8 gap-4">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 text-white/70">
              <MapPin className="h-3.5 w-3.5 text-[#D8FF3E]" aria-hidden />
              Tamrakar Complex, New Road - Verified Mobile Shops
            </span>
            <span className="text-white/30">•</span>
            <span className="inline-flex items-center gap-1.5 text-white/70">
              <BadgeCheck className="h-3.5 w-3.5 text-[#10B981]" aria-hidden />
              Verified Stores Only
            </span>
          </div>
          <div className="flex items-center gap-4 text-white/60">
            <a href="/stores" className="transition-colors hover:text-white">Find Stores</a>
            <span className="text-white/30">•</span>
            <a href="/repair" className="transition-colors hover:text-white">Book Repair</a>
            <span className="text-white/30">•</span>
            <a href="/sell-your-phone" className="transition-colors font-semibold text-[#D8FF3E]">Sell Phone</a>
          </div>
        </div>
      </div>

      {/* ── Main bar ─────────────────────────────────────────────────────── */}
      <div className="border-b bg-[#11130F] border-white/10 shadow-sm">
        <div className="container flex h-14 items-center gap-4">
          {/* Wordmark */}
          <Link
            to="/"
            className="flex shrink-0 items-center gap-2.5 pressable"
            aria-label="Tamrakar Complex home"
          >
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm"
              style={{
                border: "1px solid rgba(216, 255, 62, 0.35)",
              }}
            >
              <img src={logo} alt="Tamrakar Complex" width={32} height={32} className="h-7 w-7 object-contain" loading="eager" />
            </div>
            <span className="hidden font-display text-base font-bold tracking-tight sm:block text-white">
              Tamrakar<span className="text-[#D8FF3E]">.</span>
            </span>
          </Link>

          {/* Search bar - desktop */}
          <button
            onClick={() => setIsSearchDialogOpen(true)}
            className="hidden lg:flex flex-1 max-w-lg ml-4 items-center gap-2 h-10 px-3 text-sm transition-all pressable rounded-xl"
            aria-label="Open search"
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.10)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(255, 255, 255, 0.09)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(59, 130, 246, 0.30)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(255, 255, 255, 0.06)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255, 255, 255, 0.10)";
            }}
          >
            <Search className="h-3.5 w-3.5 shrink-0 text-white/50" />
            <span className="truncate flex-1 text-left text-white/50">Search iPhone, Samsung, MacBook, shop, repair…</span>
            <kbd
              className="hidden xl:inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium border border-white/15 bg-white/5 text-white/50"
            >
              ⌘K
            </kbd>
          </button>

          {/* Actions */}
          <div className="flex items-center gap-1.5 ml-auto">
            {/* Mobile search */}
            <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9 text-white/70 hover:text-white hover:bg-white/10" onClick={() => setIsSearchDialogOpen(true)}>
              <Search className="h-4 w-4" />
            </Button>

            <ThemeToggle className="h-9 w-9 text-white/70 hover:text-white hover:bg-white/10" />
            <CartSheet triggerClassName="h-9 w-9 text-white/70 hover:text-white hover:bg-white/10" />

            {user && <NotificationBell triggerClassName="h-9 w-9 text-white/70 hover:text-white hover:bg-white/10" />}

            {/* Wishlist */}
            <Button variant="ghost" size="icon" className="relative hidden md:flex h-9 w-9 text-white/70 hover:text-white hover:bg-white/10" asChild>
              <Link to="/wishlist" aria-label="Wishlist">
                <Heart className="h-4 w-4" />
                {wishlistCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center px-1 text-[9px] font-bold rounded-full bg-[#FF6848] text-[#11130F]">
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
              className="hidden md:flex h-9 w-9 items-center justify-center text-white hover:opacity-90 transition-opacity pressable rounded-lg"
              aria-label="WhatsApp"
              style={{ background: "#25D366" }}
            >
              <MessageCircle className="h-4 w-4" />
            </a>

            {/* Amber Sell CTA */}
            <Link
              to="/sell-your-phone"
              className="hidden xl:inline-flex h-8 items-center px-4 text-xs font-bold transition-all hover:opacity-90 pressable bg-[#D8FF3E] text-[#11130F]"
              style={{ clipPath: "polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)" }}
            >
              Sell Phone
            </Link>

            {/* Admin console */}
            {user && (role === "suadmin" || role === "staffadmin" || isStoreAdminUser) && (
              <Link
                to={
                  role === "suadmin"
                    ? "/suadmin/console"
                    : role === "staffadmin"
                      ? "/staffadmin/console"
                      : "/storeadmin/console"
                }
                className="hidden xl:inline-flex h-8 items-center px-4 text-xs font-semibold transition-all hover:opacity-90 pressable rounded-lg border border-[#3B82F6]/30 bg-[#3B82F6]/15 text-[#60A5FA]"
              >
                Console
              </Link>
            )}

            <UserMenuDropdown user={user} onSignOut={handleSignOut} triggerClassName="text-white/70 hover:text-white hover:bg-white/10" />

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
        visibleQuickItems={visibleQuickItems}
      />

      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        topLevelHomeItem={topLevelHomeItem}
        siteNavigationGroups={siteNavigationGroups}
        visibleQuickItems={visibleQuickItems}
        user={user}
      />

      <SearchDialog open={isSearchDialogOpen} onOpenChange={setIsSearchDialogOpen} />
    </header>
  );
}
