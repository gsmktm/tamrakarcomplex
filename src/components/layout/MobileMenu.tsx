import { Link, useLocation } from "react-router-dom";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { User } from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  description?: string;
}

interface NavGroup {
  name: string;
  href: string;
  items: NavItem[];
}

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  topLevelHomeItem: NavItem;
  siteNavigationGroups: NavGroup[];
  visibleQuickItems: NavItem[];
  user: SupabaseUser | null;
}

export function MobileMenu({
  isOpen,
  onClose,
  topLevelHomeItem,
  siteNavigationGroups,
  visibleQuickItems,
  user,
}: MobileMenuProps) {
  const location = useLocation();
  const currentPath = `${location.pathname}${location.search}${location.hash}`;

  if (!isOpen) return null;

  return (
    <nav id="mobile-primary-menu" aria-label="Mobile primary" className="animate-fade-in-up max-h-[calc(100dvh-3.5rem)] overflow-y-auto overscroll-contain border-b border-border bg-background/96 shadow-xl backdrop-blur-md lg:hidden">
      <div className="container space-y-2 py-4">
        {user ? (
          <Link
            to="/user"
            className="block rounded-xl px-4 py-3 text-sm font-semibold text-primary transition-colors hover:bg-secondary"
            onClick={onClose}
          >
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" aria-hidden="true" />
              My Dashboard
            </div>
          </Link>
        ) : (
          <Link
            to="/auth"
            state={{ from: currentPath }}
            className="block rounded-xl bg-primary/10 px-4 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
            onClick={onClose}
          >
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" aria-hidden="true" />
              Sign In to Your Account
            </div>
          </Link>
        )}

        <Link
          to={topLevelHomeItem.href}
          className="block rounded-xl px-4 py-3 text-sm font-semibold transition-colors hover:bg-secondary"
          onClick={onClose}
        >
          {topLevelHomeItem.name}
        </Link>

        <Link
          to="/stores"
          className="block rounded-xl px-4 py-3 text-sm font-semibold transition-colors hover:bg-secondary"
          onClick={onClose}
        >
          Stores
        </Link>

        <Link
          to="/marketplace"
          className="block rounded-xl px-4 py-3 text-sm font-semibold transition-colors hover:bg-secondary"
          onClick={onClose}
        >
          Marketplace
        </Link>

        <Link
          to="/repair"
          className="block rounded-xl px-4 py-3 text-sm font-semibold transition-colors hover:bg-secondary"
          onClick={onClose}
        >
          Repair
        </Link>

        <Link
          to="/unlocking"
          className="block rounded-xl px-4 py-3 text-sm font-semibold transition-colors hover:bg-secondary"
          onClick={onClose}
        >
          Unlocking
        </Link>

        {siteNavigationGroups.map((group) => (
          <div key={group.name}>
            <Link
              to={group.href}
              className="block rounded-xl px-4 py-2 text-xs font-semibold uppercase text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              onClick={onClose}
            >
              {group.name}
            </Link>
            <div className="space-y-1">
              {group.items.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className="block rounded-xl px-4 py-3 transition-colors hover:bg-secondary"
                  onClick={onClose}
                >
                  <div className="text-sm font-medium">{item.name}</div>
                  {item.description ? (
                    <div className="mt-1 text-xs text-muted-foreground">{item.description}</div>
                  ) : null}
                </Link>
              ))}
            </div>
          </div>
        ))}

        {visibleQuickItems.length > 0 ? (
          <>
            <div className="my-3 border-t border-border" />
            <div className="px-4 py-2 text-xs font-semibold uppercase text-muted-foreground">More Links</div>
            {visibleQuickItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className="block rounded-xl px-4 py-2 text-sm transition-colors hover:bg-secondary"
                onClick={onClose}
              >
                {item.name}
              </Link>
            ))}
          </>
        ) : null}

      </div>
    </nav>
  );
}
