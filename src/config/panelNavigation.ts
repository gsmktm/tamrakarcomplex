import type { ComponentType } from "react";
import {
  BarChart3,
  Calculator,
  Calendar,
  ClipboardList,
  CheckCircle,
  Database,
  LayoutDashboard,
  Settings,
  ShieldAlert,
  Users,
  User,
  Wrench,
  Store,
  Package,
  CreditCard,
  FileText,
  ShoppingBag,
  MessageSquare,
  Tag,
  Unlock,
  Eye,
  DollarSign,
  Bell,
  Lock,
  Palette,
  Search,
  Image as ImageIcon,
  RefreshCw,
  Smartphone,
  Star,
  Megaphone,
} from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  requiredRole: "suadmin" | "staffadmin" | "storeadmin" | "user";
  requiredModule?: string | null;
  enabled: boolean;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

export const PANEL_NAVIGATION: Record<string, NavGroup[]> = {
  suadmin: [
    {
      title: "Command Center",
      items: [
        { label: "Command Center", href: "/suadmin", icon: LayoutDashboard, requiredRole: "suadmin", enabled: true },
        { label: "Unified Workflows", href: "/suadmin/workflows", icon: ClipboardList, requiredRole: "suadmin", enabled: true },
      ],
    },
    {
      title: "Team & Access",
      items: [
        { label: "Team & Access", href: "/suadmin/team-access", icon: Users, requiredRole: "suadmin", enabled: true },
      ],
    },
    {
      title: "Customers",
      items: [
        { label: "Customers", href: "/suadmin/customers", icon: Users, requiredRole: "suadmin", enabled: true },
      ],
    },
    {
      title: "Platform Operations",
      items: [
        { label: "Operations", href: "/suadmin/operations", icon: Package, requiredRole: "suadmin", enabled: true },
      ],
    },
    {
      title: "Store Network",
      items: [
        { label: "Store Network", href: "/suadmin/store-network", icon: Store, requiredRole: "suadmin", enabled: true },
      ],
    },
    {
      title: "Billing",
      items: [
        { label: "Billing", href: "/suadmin/billing", icon: DollarSign, requiredRole: "suadmin", enabled: true },
      ],
    },
    {
      title: "Publishing",
      items: [
        { label: "Publishing", href: "/suadmin/publishing", icon: FileText, requiredRole: "suadmin", enabled: true },
      ],
    },
    {
      title: "Engagement",
      items: [
        { label: "Engagement", href: "/suadmin/engagement", icon: MessageSquare, requiredRole: "suadmin", enabled: true },
      ],
    },
    {
      title: "Growth & Insights",
      items: [
        { label: "Growth & Insights", href: "/suadmin/growth", icon: BarChart3, requiredRole: "suadmin", enabled: true },
      ],
    },
    {
      title: "System",
      items: [
        { label: "System", href: "/suadmin/system", icon: Settings, requiredRole: "suadmin", enabled: true },
      ],
    },
  ],
  staffadmin: [
    {
      title: "Overview",
      items: [
        { label: "Dashboard", href: "/staffadmin", icon: LayoutDashboard, requiredRole: "staffadmin", enabled: true },
        { label: "My Profile", href: "/staffadmin/me", icon: User, requiredRole: "staffadmin", enabled: true },
      ],
    },
    {
      title: "Platform Operations",
      items: [
        { label: "Users", href: "/staffadmin/users", icon: Users, requiredRole: "staffadmin", requiredModule: "users", enabled: true },
        { label: "Stores", href: "/staffadmin/stores", icon: Store, requiredRole: "staffadmin", requiredModule: "stores", enabled: true },
        { label: "Store Applications", href: "/staffadmin/store-applications", icon: FileText, requiredRole: "staffadmin", requiredModule: "stores", enabled: true },
        { label: "Products", href: "/staffadmin/products", icon: Package, requiredRole: "staffadmin", requiredModule: "products", enabled: true },
        { label: "Price List", href: "/staffadmin/price-list", icon: DollarSign, requiredRole: "staffadmin", requiredModule: "price_list", enabled: true },
        { label: "Mobile Master", href: "/staffadmin/mobile-master", icon: Database, requiredRole: "staffadmin", requiredModule: "products", enabled: true },
        { label: "Accessories", href: "/staffadmin/accessories", icon: Tag, requiredRole: "staffadmin", requiredModule: "products", enabled: true },
        { label: "Brands", href: "/staffadmin/brands", icon: Tag, requiredRole: "staffadmin", requiredModule: "brands", enabled: true },
        { label: "Device Verification", href: "/staffadmin/device-verification", icon: CheckCircle, requiredRole: "staffadmin", requiredModule: "device_verification", enabled: true },
        { label: "Orders", href: "/staffadmin/orders", icon: CreditCard, requiredRole: "staffadmin", requiredModule: "orders", enabled: true },
        { label: "Leads", href: "/staffadmin/leads", icon: User, requiredRole: "staffadmin", requiredModule: "leads", enabled: true },
        { label: "Payouts", href: "/staffadmin/payouts", icon: DollarSign, requiredRole: "staffadmin", requiredModule: "payouts", enabled: true },
        { label: "Repairs", href: "/staffadmin/repairs", icon: Wrench, requiredRole: "staffadmin", requiredModule: "repair_requests", enabled: true },
        { label: "Unlocking", href: "/staffadmin/unlocking", icon: Unlock, requiredRole: "staffadmin", requiredModule: "unlocking_requests", enabled: true },
        { label: "Listings", href: "/staffadmin/listings", icon: ShoppingBag, requiredRole: "staffadmin", requiredModule: "community_listings", enabled: true },
        { label: "Mail Box", href: "/staffadmin/messages", icon: MessageSquare, requiredRole: "staffadmin", requiredModule: "mailbox", enabled: true },
        { label: "Analytics", href: "/staffadmin/analytics", icon: BarChart3, requiredRole: "staffadmin", requiredModule: "analytics", enabled: true },
        { label: "SEO Growth", href: "/staffadmin/seo", icon: Search, requiredRole: "staffadmin", requiredModule: "seo_growth", enabled: true },
        { label: "My Tasks", href: "/staffadmin/tasks", icon: Calendar, requiredRole: "staffadmin", requiredModule: "dashboard", enabled: true },
        { label: "My Performance", href: "/staffadmin/performance", icon: BarChart3, requiredRole: "staffadmin", requiredModule: "analytics", enabled: true },
      ],
    },
    {
      title: "Content Management",
      items: [
        { label: "Articles", href: "/staffadmin/articles", icon: FileText, requiredRole: "staffadmin", requiredModule: "articles", enabled: true },
        { label: "Guides & FAQs", href: "/staffadmin/guides", icon: FileText, requiredRole: "staffadmin", requiredModule: "guides", enabled: true },
        { label: "Content Pages", href: "/staffadmin/content", icon: FileText, requiredRole: "staffadmin", requiredModule: "content_pages", enabled: true },
        { label: "Comments", href: "/staffadmin/comments", icon: MessageSquare, requiredRole: "staffadmin", requiredModule: "content_pages", enabled: true },
        { label: "Polls", href: "/staffadmin/polls", icon: BarChart3, requiredRole: "staffadmin", requiredModule: "user_polls", enabled: true },
      ],
    },
    {
      title: "System Control",
      items: [
        { label: "Subscriptions", href: "/staffadmin/subscriptions", icon: CreditCard, requiredRole: "staffadmin", requiredModule: "subscriptions", enabled: true },
        { label: "Valuation", href: "/staffadmin/valuation", icon: DollarSign, requiredRole: "staffadmin", requiredModule: "valuation_manager", enabled: true },
        { label: "Themes", href: "/staffadmin/themes", icon: Eye, requiredRole: "staffadmin", requiredModule: "content_pages", enabled: true },
        { label: "ChatBot Config", href: "/staffadmin/chatbot", icon: MessageSquare, requiredRole: "staffadmin", requiredModule: "chatbot_config", enabled: true },
        { label: "Admin Console", href: "/staffadmin/console", icon: Database, requiredRole: "staffadmin", requiredModule: "settings", enabled: true },
        { label: "Settings", href: "/staffadmin/settings", icon: Settings, requiredRole: "staffadmin", requiredModule: "settings", enabled: true },
      ],
    },
  ],
  storeadmin: [
    {
      title: "Overview",
      items: [
        { label: "Dashboard", href: "/storeadmin", icon: LayoutDashboard, requiredRole: "storeadmin", enabled: true },
        { label: "Store Analytics", href: "/storeadmin/analytics", icon: BarChart3, requiredRole: "storeadmin", enabled: true },
        { label: "Store Console", href: "/storeadmin/console", icon: Database, requiredRole: "storeadmin", enabled: true },
      ],
    },
    {
      title: "Store Setup",
      items: [
        { label: "Store Profile", href: "/storeadmin/profile", icon: Store, requiredRole: "storeadmin", requiredModule: "settings", enabled: true },
        { label: "Media & Branding", href: "/storeadmin/media", icon: ImageIcon, requiredRole: "storeadmin", requiredModule: "branding", enabled: true },
        { label: "Theme Builder", href: "/storeadmin/theme", icon: Palette, requiredRole: "storeadmin", requiredModule: "branding", enabled: true },
        { label: "Settings", href: "/storeadmin/settings", icon: Settings, requiredRole: "storeadmin", requiredModule: "settings", enabled: true },
        { label: "Subscription", href: "/storeadmin/my-subscription", icon: CreditCard, requiredRole: "storeadmin", enabled: true },
      ],
    },
    {
      title: "Catalog",
      items: [
        { label: "Inventory", href: "/storeadmin/products", icon: Package, requiredRole: "storeadmin", requiredModule: "products", enabled: true },
        { label: "Accessories", href: "/storeadmin/accessories", icon: Smartphone, requiredRole: "storeadmin", requiredModule: "products", enabled: true },
        { label: "Listings", href: "/storeadmin/listings", icon: ShoppingBag, requiredRole: "storeadmin", requiredModule: "products", enabled: true },
      ],
    },
    {
      title: "Sales",
      items: [
        { label: "Orders", href: "/storeadmin/orders", icon: CreditCard, requiredRole: "storeadmin", requiredModule: "orders", enabled: true },
        { label: "Sell Leads", href: "/storeadmin/leads", icon: Smartphone, requiredRole: "storeadmin", requiredModule: "leads", enabled: true },
        { label: "Store Inquiries", href: "/storeadmin/store-leads", icon: User, requiredRole: "storeadmin", requiredModule: "leads", enabled: true },
        { label: "Reviews", href: "/storeadmin/reviews", icon: Star, requiredRole: "storeadmin", requiredModule: "orders", enabled: true },
      ],
    },
    {
      title: "Service Desk",
      items: [
        { label: "Repair Services", href: "/storeadmin/repair-services", icon: Wrench, requiredRole: "storeadmin", requiredModule: "orders", enabled: true },
        { label: "Repair Requests", href: "/storeadmin/repairs", icon: Wrench, requiredRole: "storeadmin", requiredModule: "orders", enabled: true },
        { label: "Exchanges", href: "/storeadmin/exchange", icon: RefreshCw, requiredRole: "storeadmin", requiredModule: "orders", enabled: true },
        { label: "Unlocking Requests", href: "/storeadmin/unlocking", icon: Unlock, requiredRole: "storeadmin", requiredModule: "orders", enabled: true },
      ],
    },
    {
      title: "Financials",
      items: [
        { label: "Payouts", href: "/storeadmin/payouts", icon: DollarSign, requiredRole: "storeadmin", requiredModule: "payouts", enabled: true },
        { label: "Payout Settings", href: "/storeadmin/payout-settings", icon: Settings, requiredRole: "storeadmin", requiredModule: "payouts", enabled: true },
      ],
    },
    {
      title: "Team & Account",
      items: [
        { label: "Store Staff", href: "/storeadmin/staff", icon: Users, requiredRole: "storeadmin", requiredModule: "staff", enabled: true },
        { label: "Messages", href: "/storeadmin/messages", icon: MessageSquare, requiredRole: "storeadmin", requiredModule: "leads", enabled: true },
        { label: "My Profile", href: "/storeadmin/me", icon: User, requiredRole: "storeadmin", enabled: true },
        { label: "Notifications", href: "/storeadmin/notifications", icon: Bell, requiredRole: "storeadmin", enabled: true },
        { label: "Security", href: "/storeadmin/security", icon: Lock, requiredRole: "storeadmin", enabled: true },
      ],
    },
  ],
  user: [
    {
      title: "Dashboard",
      items: [
        { label: "Dashboard", href: "/user", icon: LayoutDashboard, requiredRole: "user", enabled: true },
      ],
    },
    {
      title: "My Activity",
      items: [
        { label: "My Orders", href: "/user/orders", icon: CreditCard, requiredRole: "user", enabled: true },
        { label: "My Repairs", href: "/user/repairs", icon: Wrench, requiredRole: "user", enabled: true },
        { label: "My Unlocks", href: "/user/unlocking", icon: Unlock, requiredRole: "user", enabled: true },
        { label: "My Listings", href: "/user/listings", icon: ShoppingBag, requiredRole: "user", enabled: true },
        { label: "Activity History", href: "/user/history", icon: Eye, requiredRole: "user", enabled: true },
      ],
    },
    {
      title: "Account Center",
      items: [
        { label: "Personal Profile", href: "/user/me", icon: User, requiredRole: "user", enabled: true },
        { label: "Account Settings", href: "/user/settings", icon: Settings, requiredRole: "user", enabled: true },
      ],
    },
  ],
};
