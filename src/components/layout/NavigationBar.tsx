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

export function NavigationBar({
  topLevelHomeItem,
  siteNavigationGroups,
  exploreLandingItem,
  exploreItems,
  visibleQuickItems,
}: NavigationBarProps) {
  return (
    <div className="hidden border-b border-border/60 bg-background/92 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 lg:block">
      <div className="container flex h-14 items-center overflow-x-auto no-scrollbar">
        <NavigationMenu className="max-w-full">
          <NavigationMenuList className="flex-nowrap">
            <NavigationMenuItem>
              <NavigationMenuLink asChild>
                <Link
                  to={topLevelHomeItem.href}
                  className={cn(
                    "group inline-flex h-10 w-max items-center justify-center whitespace-nowrap rounded-full bg-transparent px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary hover:text-foreground focus:bg-secondary focus:text-foreground focus:outline-none",
                  )}
                >
                  {topLevelHomeItem.name}
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuLink asChild>
                <Link
                  to="/stores"
                  className={cn(
                    "group inline-flex h-10 w-max items-center justify-center whitespace-nowrap rounded-full bg-transparent px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary hover:text-foreground focus:bg-secondary focus:text-foreground focus:outline-none",
                  )}
                >
                  Stores
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuLink asChild>
                <Link
                  to="/marketplace"
                  className={cn(
                    "group inline-flex h-10 w-max items-center justify-center whitespace-nowrap rounded-full bg-transparent px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary hover:text-foreground focus:bg-secondary focus:text-foreground focus:outline-none",
                  )}
                >
                  Marketplace
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>

            {siteNavigationGroups.map((group) => (
              <NavigationMenuItem key={group.name}>
                <div className="flex items-center rounded-full border border-transparent transition-colors hover:bg-secondary focus-within:bg-secondary">
                  <NavigationMenuLink asChild>
                    <Link
                      to={group.href}
                      className="inline-flex h-10 items-center rounded-l-full px-3 text-sm font-medium transition-colors hover:text-foreground focus:outline-none"
                    >
                      {group.name}
                    </Link>
                  </NavigationMenuLink>
                  <NavigationMenuTrigger className="h-10 rounded-l-none rounded-r-full bg-transparent px-2 hover:bg-transparent data-[active]:bg-transparent data-[state=open]:bg-secondary">
                    <span className="sr-only">Open {group.name} menu</span>
                  </NavigationMenuTrigger>
                </div>
                <NavigationMenuContent>
                  <div className="w-[560px] p-4">
                    <div className="mb-3 px-1">
                      <Link to={group.href} className="text-sm font-semibold transition-colors hover:text-primary">
                        {group.name}
                      </Link>
                      <p className="text-sm text-muted-foreground">{group.description}</p>
                    </div>
                    <ul className="grid gap-3 md:grid-cols-2">
                      {group.items.map((item) => (
                        <li key={item.name}>
                          <NavigationMenuLink asChild>
                            <Link
                              to={item.href}
                              className="block select-none space-y-1 rounded-xl border border-border/60 bg-card p-3 leading-none no-underline outline-none transition-colors hover:bg-secondary focus:bg-secondary"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="text-sm font-medium leading-none">{item.name}</div>
                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                                {item.description}
                              </p>
                            </Link>
                          </NavigationMenuLink>
                        </li>
                      ))}
                    </ul>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
            ))}

            <NavigationMenuItem>
              <div className="flex items-center rounded-full border border-transparent transition-colors hover:bg-secondary focus-within:bg-secondary">
                <NavigationMenuLink asChild>
                  <Link
                    to={exploreLandingItem.href}
                    className="inline-flex h-10 items-center rounded-l-full px-3 text-sm font-medium transition-colors hover:text-foreground focus:outline-none"
                  >
                    {exploreLandingItem.name}
                  </Link>
                </NavigationMenuLink>
                <NavigationMenuTrigger className="h-10 rounded-l-none rounded-r-full bg-transparent px-2 hover:bg-transparent data-[active]:bg-transparent data-[state=open]:bg-secondary">
                  <span className="sr-only">Open explore menu</span>
                </NavigationMenuTrigger>
              </div>
              <NavigationMenuContent>
                <ul className="grid w-[440px] gap-3 p-4 md:w-[560px] md:grid-cols-2">
                  {exploreItems.map((item) => (
                    <li key={item.name}>
                      <NavigationMenuLink asChild>
                        <Link
                          to={item.href}
                          className="block select-none space-y-1 rounded-xl border border-border/60 bg-card p-3 leading-none no-underline outline-none transition-colors hover:bg-secondary focus:bg-secondary"
                        >
                          <div className="text-sm font-medium leading-none">{item.name}</div>
                          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                            {item.description}
                          </p>
                        </Link>
                      </NavigationMenuLink>
                    </li>
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>

            {visibleQuickItems.map((category) => (
              <NavigationMenuItem key={category.name}>
                <NavigationMenuLink asChild>
                  <Link
                    to={category.href}
                    className={cn(
                      "group inline-flex h-10 w-max items-center justify-center whitespace-nowrap rounded-full bg-transparent px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary hover:text-foreground focus:bg-secondary focus:text-foreground focus:outline-none",
                    )}
                  >
                    {category.name}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        <a href="tel:+977015351731" className="ml-auto hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10 transition-colors hover:bg-primary/10">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
            <Phone className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-sm font-bold text-foreground">+977-015351731</span>
        </a>
      </div>
    </div>
  );
}
