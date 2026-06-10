import { NavLink, useLocation } from "react-router-dom";
import { Home, ShoppingBag, Tag, Store, User } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { to: "/", label: "Home", icon: Home, exact: true },
  { to: "/buy", label: "Buy", icon: ShoppingBag },
  { to: "/sell-your-phone", label: "Sell", icon: Tag },
  { to: "/stores", label: "Stores", icon: Store },
  { to: "/profile", label: "Account", icon: User },
];

// Routes where the sticky bottom nav should be hidden (focused flows / admin shells).
const HIDDEN_PREFIXES = ["/checkout", "/auth", "/admin", "/suadmin", "/staff", "/store-admin"];

export function BottomNav() {
  const { pathname } = useLocation();

  if (HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return null;
  }

  return (
    <nav
      aria-label="Primary"
      className="md:hidden fixed inset-x-0 bottom-0 z-40 glass-card border-t pb-safe"
    >
      <ul className="flex items-stretch justify-around">
        {ITEMS.map(({ to, label, icon: Icon, exact }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={exact}
              className={({ isActive }) =>
                cn(
                  // 44px+ touch target, 8px-safe spacing via flex
                  "flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )
              }
              aria-label={label}
            >
              {({ isActive }) => (
                <>
                  <Icon className="h-5 w-5" aria-hidden="true" strokeWidth={isActive ? 2.4 : 1.8} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
