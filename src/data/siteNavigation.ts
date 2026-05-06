export interface SiteNavItem {
  name: string;
  href: string;
  description?: string;
}

export interface SiteNavGroup {
  name: string;
  href: string;
  description: string;
  items: SiteNavItem[];
}

export const exploreLandingItem: SiteNavItem = {
  name: "Explore",
  href: "/explore",
  description: "Browse categories, prices, and product discovery paths.",
};

export const defaultQuickMenuItems: SiteNavItem[] = [
  { name: "Home", href: "/" },
  { name: "Price List", href: "/mobile-price" },
  { name: "Marketplace", href: "/marketplace" },
  { name: "Stores", href: "/stores" },
  { name: "Reviews", href: "/reviews" },
  { name: "About", href: "/about-us" },
  { name: "Contact", href: "/contact-us" },
];

export const siteNavigationGroups: SiteNavGroup[] = [
  {
    name: "Buy",
    href: "/buy",
    description: "Browse products, compare prices, and discover stores.",
    items: [
      { name: "Buy Gadgets", href: "/buy", description: "Phones, laptops, tablets, wearables, and accessories" },
      { name: "Mobile Price", href: "/mobile-price", description: "Current phone prices and Nepal market references" },
      { name: "Laptop Price", href: "/laptop-price", description: "Laptop price lists for work, study, and gaming" },
      { name: "Compare", href: "/compare", description: "Side-by-side comparisons before you buy" },
      { name: "Stores", href: "/stores", description: "Verified stores, distributors, and repair partners" },
      { name: "Marketplace", href: "/marketplace", description: "Buy directly from community and store listings" },
      { name: "Unlocking Hub", href: "/unlocking", description: "Professional device unlocking and software services" },
    ],
  },
  {
    name: "Sell & Exchange",
    href: "/sell-your-phone",
    description: "Turn your current device into cash or your next upgrade.",
    items: [
      { name: "Sell Your Phone", href: "/sell-your-phone", description: "Get an instant estimate and submit a sell request" },
      { name: "Exchange Your Phone", href: "/exchange-your-phone", description: "Trade in an old device toward your next one" },
      { name: "Valuation Estimator", href: "/valuation-estimator", description: "Check fair market value before selling or upgrading" },
      { name: "Sell on Marketplace", href: "/marketplace/sell", description: "Create your own listing and sell directly" },
      { name: "Order Tracking", href: "/user/history", description: "Monitor requests, listings, and account activity" },
    ],
  },
  {
    name: "Company",
    href: "/about-us",
    description: "About Tamrakar Complex, policies, and account essentials.",
    items: [
      { name: "About Us", href: "/about-us", description: "Our story, mission, and the team behind Tamrakar Complex" },
      { name: "Privacy Policy", href: "/privacy-policy", description: "How we collect and use data" },
      { name: "Terms of Service", href: "/terms-of-service", description: "Platform terms and usage guidelines" },
      { name: "Wishlist", href: "/wishlist", description: "Saved gadgets and listings to revisit later" },
      { name: "My Profile", href: "/user/me", description: "Complete your profile to sell faster" },
      { name: "My Subscription", href: "/user/me?tab=subscription", description: "View Silver / Gold / Diamond store packages" },
    ],
  },
  {
    name: "Learn",
    href: "/news",
    description: "News, reviews, guides, and buying advice in one newsroom.",
    items: [
      { name: "News", href: "/news", description: "Launches, price drops, and Nepal tech updates" },
      { name: "Reviews", href: "/reviews", description: "Hands-on opinions and verdicts before you spend" },
      { name: "Mobile Guides", href: "/mobile-guides", description: "Buying guides, tips, and explainers for phones" },
      { name: "Laptop Guides", href: "/laptop-guides", description: "Best picks and practical laptop advice" },
    ],
  },
];

export const footerLinkGroups = [
  {
    title: "Buy",
    links: [
      { name: "Buy Gadgets", href: "/buy" },
      { name: "Mobile Price", href: "/mobile-price" },
      { name: "Laptop Price", href: "/laptop-price" },
      { name: "Compare", href: "/compare" },
      { name: "Marketplace", href: "/marketplace" },
      { name: "Stores", href: "/stores" },
    ],
  },
  {
    title: "Learn",
    links: [
      { name: "News", href: "/news" },
      { name: "Reviews", href: "/reviews" },
      { name: "Mobile Guides", href: "/mobile-guides" },
      { name: "Laptop Guides", href: "/laptop-guides" },
    ],
  },
  {
    title: "Company",
    links: [
      { name: "About Us", href: "/about-us" },
      { name: "Contact Us", href: "/contact-us" },
      { name: "Privacy Policy", href: "/privacy-policy" },
      { name: "Terms of Service", href: "/terms-of-service" },
    ],
  },
];
