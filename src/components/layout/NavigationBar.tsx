import { Link, useLocation } from "react-router-dom";
import { ArrowRight, Phone } from "lucide-react";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";

interface NavItem {
  name: string;
  href: string;
  description?: string;
}

interface NavGroup {
  name: string;
  href: string;
  description?: string;
  items: NavItem[];
}

interface NavigationBarProps {
  topLevelHomeItem: NavItem;
  siteNavigationGroups: NavGroup[];
  visibleQuickItems: NavItem[];
}

/* Nav link — white on midnight, violet underline */
const navLink =
  "relative inline-flex h-12 items-center whitespace-nowrap px-3 text-sm font-medium transition-colors duration-150 focus:outline-none focus-visible:after:scale-x-100 [color:oklch(65%_0_0_/_0.65)] hover:[color:oklch(85%_0_0)] after:absolute after:bottom-0 after:left-3 after:right-3 after:h-[2px] after:scale-x-0 after:[background:linear-gradient(90deg,oklch(62%_0.25_285),oklch(78%_0.165_65))] after:transition-transform after:duration-200 hover:after:scale-x-100";

const navTrigger =
  "relative inline-flex h-12 items-center whitespace-nowrap px-3 text-sm font-medium transition-colors duration-150 focus:outline-none [color:oklch(65%_0_0_/_0.65)] hover:[color:oklch(85%_0_0)] data-[state=open]:[color:oklch(85%_0_0)] after:absolute after:bottom-0 after:left-3 after:right-3 after:h-[2px] after:scale-x-0 after:[background:linear-gradient(90deg,oklch(62%_0.25_285),oklch(78%_0.165_65))] after:transition-transform after:duration-200 hover:after:scale-x-100 data-[state=open]:after:scale-x-100";

export function NavigationBar({
  topLevelHomeItem,
  siteNavigationGroups,
  visibleQuickItems,
}: NavigationBarProps) {
  const { pathname } = useLocation();
  const isCurrent = (href: string) => href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div
      className="hidden lg:block border-b"
      style={{
        background: "linear-gradient(180deg, oklch(12% 0.030 260) 0%, oklch(11% 0.028 258) 100%)",
        borderColor: "oklch(62% 0.25 285 / 0.12)",
      }}
    >
      <div className="container flex h-12 items-center overflow-x-auto no-scrollbar">
        <NavigationMenu className="max-w-full">
          <NavigationMenuList className="flex-nowrap gap-0">
            {/* Home */}
            <NavigationMenuItem>
              <NavigationMenuLink asChild>
                <Link to={topLevelHomeItem.href} className={navLink} aria-current={isCurrent(topLevelHomeItem.href) ? "page" : undefined}>
                  {topLevelHomeItem.name}
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>

            {/* Stores */}
            <NavigationMenuItem>
              <NavigationMenuLink asChild>
                <Link to="/stores" className={navLink} aria-current={isCurrent("/stores") ? "page" : undefined}>
                  Stores
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>

            {/* Marketplace */}
            <NavigationMenuItem>
              <NavigationMenuLink asChild>
                <Link to="/marketplace" className={navLink} aria-current={isCurrent("/marketplace") ? "page" : undefined}>
                  Marketplace
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>

            {/* Repair */}
            <NavigationMenuItem>
              <NavigationMenuLink asChild>
                <Link to="/repair" className={navLink} aria-current={isCurrent("/repair") ? "page" : undefined}>
                  Repair
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>

            {/* Unlocking */}
            <NavigationMenuItem>
              <NavigationMenuLink asChild>
                <Link to="/unlocking" className={navLink} aria-current={isCurrent("/unlocking") ? "page" : undefined}>
                  Unlocking
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>

            {/* Site navigation groups */}
            {siteNavigationGroups.map((group) => (
              <NavigationMenuItem key={group.name} value={group.name}>
                <NavigationMenuTrigger
                  className={cn(
                    navTrigger,
                    "bg-transparent hover:bg-transparent data-[state=open]:bg-transparent",
                  )}
                  aria-label={`${group.name} menu`}
                >
                  {group.name}
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="w-[540px] p-5">
                    <div className="mb-4 pb-3 border-b border-border">
                      <Link
                        to={group.href}
                        className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
                      >
                        {group.name}
                      </Link>
                      {group.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{group.description}</p>
                      )}
                    </div>
                    <ul className="grid gap-1 md:grid-cols-2">
                      {group.items.map((item) => (
                        <li key={item.name}>
                          <NavigationMenuLink asChild>
                            <Link
                              to={item.href}
                              className="group flex items-start gap-3 select-none rounded-sm p-3 no-underline outline-none transition-colors hover:bg-secondary focus:bg-secondary"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-foreground leading-tight">
                                  {item.name}
                                </div>
                                {item.description && (
                                  <p className="text-xs text-muted-foreground leading-snug mt-0.5 line-clamp-2">
                                    {item.description}
                                  </p>
                                )}
                              </div>
                              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5 translate-x-0 group-hover:translate-x-1 transition-transform duration-200" style={{ transitionTimingFunction: "var(--ease-out-quart)" }} />
                            </Link>
                          </NavigationMenuLink>
                        </li>
                      ))}
                    </ul>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
            ))}

            {/* Quick items */}
            {visibleQuickItems.map((category) => (
              <NavigationMenuItem key={category.name}>
                <NavigationMenuLink asChild>
                  <Link to={category.href} className={navLink} aria-current={isCurrent(category.href.split("?")[0]) ? "page" : undefined}>
                    {category.name}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        {/* Phone — right edge */}
        <a
          href="tel:+977015351731"
          className="ml-auto hidden xl:flex items-center gap-1.5 text-xs font-medium transition-colors pressable hover:opacity-90"
          style={{ color: "oklch(78% 0.165 65 / 0.80)" }}
        >
          <Phone className="h-3 w-3" style={{ color: "oklch(78% 0.165 65)" }} aria-hidden="true" />
          +977-015351731
        </a>
      </div>
    </div>
  );
}
