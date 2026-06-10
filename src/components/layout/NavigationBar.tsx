import { Link } from "react-router-dom";
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
  exploreLandingItem: NavItem;
  exploreItems: NavItem[];
  visibleQuickItems: NavItem[];
}

/* Nav link — white on navy, gold underline */
const navLink =
  "relative inline-flex h-12 items-center whitespace-nowrap px-3 text-sm font-medium text-white/60 transition-colors duration-150 hover:text-white after:absolute after:bottom-0 after:left-3 after:right-3 after:h-0.5 after:scale-x-0 after:bg-gold after:transition-transform after:duration-200 hover:after:scale-x-100 focus:outline-none focus-visible:after:scale-x-100";

const navTrigger =
  "relative inline-flex h-12 items-center whitespace-nowrap px-3 text-sm font-medium text-white/60 transition-colors duration-150 hover:text-white data-[state=open]:text-white after:absolute after:bottom-0 after:left-3 after:right-3 after:h-0.5 after:scale-x-0 after:bg-gold after:transition-transform after:duration-200 hover:after:scale-x-100 data-[state=open]:after:scale-x-100 focus:outline-none";

export function NavigationBar({
  topLevelHomeItem,
  siteNavigationGroups,
  exploreLandingItem,
  exploreItems,
  visibleQuickItems,
}: NavigationBarProps) {
  return (
    <div className="hidden border-b border-white/10 bg-navy-light lg:block" style={{ background: "oklch(17% 0.036 258)" }}>
      <div className="container flex h-12 items-center overflow-x-auto no-scrollbar">
        <NavigationMenu className="max-w-full">
          <NavigationMenuList className="flex-nowrap gap-0">
            {/* Home */}
            <NavigationMenuItem>
              <NavigationMenuLink asChild>
                <Link to={topLevelHomeItem.href} className={navLink}>
                  {topLevelHomeItem.name}
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>

            {/* Stores */}
            <NavigationMenuItem>
              <NavigationMenuLink asChild>
                <Link to="/stores" className={navLink}>
                  Stores
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>

            {/* Marketplace */}
            <NavigationMenuItem>
              <NavigationMenuLink asChild>
                <Link to="/marketplace" className={navLink}>
                  Marketplace
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>

            {/* Site navigation groups */}
            {siteNavigationGroups.map((group) => (
              <NavigationMenuItem key={group.name}>
                <NavigationMenuTrigger
                  className={cn(
                    navTrigger,
                    "bg-transparent hover:bg-transparent data-[state=open]:bg-transparent",
                  )}
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

            {/* Explore */}
            <NavigationMenuItem>
              <NavigationMenuTrigger
                className={cn(
                  navTrigger,
                  "bg-transparent hover:bg-transparent data-[state=open]:bg-transparent",
                )}
              >
                {exploreLandingItem.name}
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <div className="w-[500px] p-5">
                  <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-3">
                    Browse by category
                  </p>
                  <ul className="grid gap-1 md:grid-cols-2">
                    {exploreItems.map((item) => (
                      <li key={item.name}>
                        <NavigationMenuLink asChild>
                          <Link
                            to={item.href}
                            className="group flex items-start gap-3 select-none rounded-sm p-3 no-underline outline-none transition-colors hover:bg-secondary focus:bg-secondary"
                          >
                            <div className="flex-1">
                              <div className="text-sm font-semibold text-foreground">{item.name}</div>
                              {item.description && (
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
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

            {/* Quick items */}
            {visibleQuickItems.map((category) => (
              <NavigationMenuItem key={category.name}>
                <NavigationMenuLink asChild>
                  <Link to={category.href} className={navLink}>
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
          className="ml-auto hidden xl:flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors pressable"
        >
          <Phone className="h-3 w-3 text-primary" />
          +977-015351731
        </a>
      </div>
    </div>
  );
}
