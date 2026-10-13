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

/* Deep-navy navigation with a single antique-gold interaction accent. */
const navLink =
  "relative inline-flex h-12 items-center whitespace-nowrap px-3 text-sm font-medium text-white/75 transition-colors duration-150 hover:text-white aria-[current=page]:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#E4BD7D] after:absolute after:bottom-0 after:left-3 after:right-3 after:h-[2px] after:scale-x-0 after:bg-[#C49A4A] after:transition-transform after:duration-200 hover:after:scale-x-100 aria-[current=page]:after:scale-x-100";

const navTrigger =
  "relative inline-flex h-12 items-center whitespace-nowrap px-3 text-sm font-medium text-white/75 transition-colors duration-150 hover:text-white data-[state=open]:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#E4BD7D] after:absolute after:bottom-0 after:left-3 after:right-3 after:h-[2px] after:scale-x-0 after:bg-[#C49A4A] after:transition-transform after:duration-200 hover:after:scale-x-100 data-[state=open]:after:scale-x-100";

export function NavigationBar({
  topLevelHomeItem,
  siteNavigationGroups,
  visibleQuickItems,
}: NavigationBarProps) {
  const { pathname } = useLocation();
  const isCurrent = (href: string) => href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="hidden lg:block border-b border-[#C49A4A]/20 bg-[#0E1A2E]">
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
          className="ml-auto hidden xl:flex items-center gap-1.5 text-xs font-medium text-[#E4BD7D] transition-colors pressable hover:text-white"
        >
          <Phone className="h-3 w-3" aria-hidden="true" />
          +977-015351731
        </a>
      </div>
    </div>
  );
}
