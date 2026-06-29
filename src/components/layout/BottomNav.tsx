import { NavLink, useLocation } from "react-router-dom";
import { Home, ShoppingBag, Tag, Store, User } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { to: "/", label: "Home", icon: Home, exact: true },
  { to: "/cat/mobiles?tab=buy", label: "Buy", icon: ShoppingBag, matchPrefix: "/cat/mobiles" },
  { to: "/sell-your-phone", label: "Sell", icon: Tag },
  { to: "/stores", label: "Stores", icon: Store },
  { to: "/profile", label: "Account", icon: User },
];

// Routes where the sticky bottom nav should be hidden (focused flows / admin shells).
const HIDDEN_PREFIXES = ["/checkout", "/auth", "/admin", "/suadmin", "/staffadmin", "/storeadmin", "/staff", "/store-admin"];

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
        {ITEMS.map(({ to, label, icon: Icon, exact, matchPrefix }) => {
          const active = matchPrefix
            ? pathname === matchPrefix || pathname.startsWith(matchPrefix + "/")
            : false;
          return (
            <li key={label} className="flex-1">
              <NavLink
                to={to}
                end={exact}
                className={({ isActive }) =>
                  cn(
                    "flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
                    (isActive || active) ? "text-primary" : "text-muted-foreground hover:text-foreground",
                  )
                }
                aria-label={label}
              >
                {({ isActive }) => (
                  <>
                    <Icon className="h-5 w-5" aria-hidden="true" strokeWidth={(isActive || active) ? 2.4 : 1.8} />
                    <span>{label}</span>
                  </>
                )}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
