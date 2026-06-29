import type { ComponentType } from "react";
import {
  BarChart3,
  Calculator,
  Calendar,
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
      title: "Overview",
      items: [
        { label: "Dashboard", href: "/suadmin", icon: LayoutDashboard, requiredRole: "suadmin", enabled: true },
        { label: "My Profile", href: "/suadmin/me", icon: User, requiredRole: "suadmin", enabled: true },
      ],
    },
    {
      title: "Admin Control",
      items: [
        { label: "Staff Admins", href: "/suadmin/staff-admins", icon: Users, requiredRole: "suadmin", enabled: true },
        { label: "Staff Permissions", href: "/suadmin/staff-permissions", icon: ShieldAlert, requiredRole: "suadmin", enabled: true },
        { label: "Staff Tasks", href: "/suadmin/staff-tasks", icon: Calendar, requiredRole: "suadmin", enabled: true },
        { label: "Staff Performance", href: "/suadmin/staff-performance", icon: BarChart3, requiredRole: "suadmin", enabled: true },
        { label: "Store Admins", href: "/suadmin/store-admins", icon: Users, requiredRole: "suadmin", enabled: true },
        { label: "Store Permissions", href: "/suadmin/store-admin-permissions", icon: ShieldAlert, requiredRole: "suadmin", enabled: true },
        { label: "Store Tasks", href: "/suadmin/store-admin-tasks", icon: Calendar, requiredRole: "suadmin", enabled: true },
        { label: "Store Staff", href: "/suadmin/store-staff", icon: Users, requiredRole: "suadmin", enabled: true },
      ],
    },
    {
      title: "User Control",
      items: [
        { label: "User Management", href: "/suadmin/users", icon: Users, requiredRole: "suadmin", enabled: true },
        { label: "User Rewards", href: "/suadmin/user-rewards", icon: DollarSign, requiredRole: "suadmin", enabled: true },
        { label: "User Risk", href: "/suadmin/user-risk", icon: ShieldAlert, requiredRole: "suadmin", enabled: true },
      ],
    },
    {
      title: "Catalog & Pricing",
      items: [
        { label: "Mobile Master", href: "/suadmin/master-data", icon: Database, requiredRole: "suadmin", enabled: true },
        { label: "Brands", href: "/suadmin/brands", icon: Tag, requiredRole: "suadmin", enabled: true },
        { label: "Products", href: "/suadmin/products", icon: Package, requiredRole: "suadmin", enabled: true },
        { label: "Price List", href: "/suadmin/price-list", icon: DollarSign, requiredRole: "suadmin", enabled: true },
        { label: "EMI Plans", href: "/suadmin/emi-plans", icon: CreditCard, requiredRole: "suadmin", enabled: true },
        { label: "Device Verification", href: "/suadmin/device-verification", icon: CheckCircle, requiredRole: "suadmin", enabled: true },
      ],
    },
    {
      title: "Commerce Ops",
      items: [
        { label: "Stores", href: "/suadmin/stores", icon: Store, requiredRole: "suadmin", enabled: true },
        { label: "Store Applications", href: "/suadmin/store-applications", icon: FileText, requiredRole: "suadmin", enabled: true },
        { label: "Orders", href: "/suadmin/orders", icon: CreditCard, requiredRole: "suadmin", enabled: true },
        { label: "Leads", href: "/suadmin/leads", icon: User, requiredRole: "suadmin", enabled: true },
        { label: "Payouts", href: "/suadmin/payouts", icon: DollarSign, requiredRole: "suadmin", enabled: true },
        { label: "Subscriptions", href: "/suadmin/subscriptions", icon: Calendar, requiredRole: "suadmin", enabled: true },
        { label: "Community Listings", href: "/suadmin/listings", icon: ShoppingBag, requiredRole: "suadmin", enabled: true },
        { label: "Exchange Requests", href: "/suadmin/exchanges", icon: RefreshCw, requiredRole: "suadmin", enabled: true },
        { label: "Campaigns", href: "/suadmin/campaigns", icon: Megaphone, requiredRole: "suadmin", enabled: true },
      ],
    },
    {
      title: "Content",
      items: [
        { label: "Articles", href: "/suadmin/articles", icon: FileText, requiredRole: "suadmin", enabled: true },
        { label: "Guides & FAQs", href: "/suadmin/guides", icon: FileText, requiredRole: "suadmin", enabled: true },
        { label: "Content Pages", href: "/suadmin/content", icon: FileText, requiredRole: "suadmin", enabled: true },
        { label: "Repair Requests", href: "/suadmin/repairs", icon: Wrench, requiredRole: "suadmin", enabled: true },
        { label: "Unlocking Requests", href: "/suadmin/unlocking", icon: Unlock, requiredRole: "suadmin", enabled: true },
      ],
    },
    {
      title: "Monitoring",
      items: [
        { label: "Platform Analytics", href: "/suadmin/analytics", icon: BarChart3, requiredRole: "suadmin", enabled: true },
        { label: "SEO Growth", href: "/suadmin/seo", icon: Search, requiredRole: "suadmin", enabled: true },
        { label: "Valuation Manager", href: "/suadmin/valuation", icon: Calculator, requiredRole: "suadmin", enabled: true },
        { label: "Audit Logs", href: "/suadmin/audit", icon: ShieldAlert, requiredRole: "suadmin", enabled: true },
        { label: "Maintenance", href: "/suadmin/maintenance", icon: Database, requiredRole: "suadmin", enabled: true },
        { label: "Platform Health", href: "/suadmin/health", icon: Eye, requiredRole: "suadmin", enabled: true },
        { label: "System Settings", href: "/suadmin/settings", icon: Settings, requiredRole: "suadmin", enabled: true },
        { label: "Mail Box", href: "/suadmin/messages", icon: MessageSquare, requiredRole: "suadmin", enabled: true },
        { label: "ChatBot Config", href: "/suadmin/chatbot", icon: MessageSquare, requiredRole: "suadmin", enabled: true },
        { label: "User Polls", href: "/suadmin/polls", icon: BarChart3, requiredRole: "suadmin", enabled: true },
        { label: "Admin Console", href: "/suadmin/console", icon: Database, requiredRole: "suadmin", enabled: true },
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
        { label: "Products", href: "/staffadmin/products", icon: Package, requiredRole: "staffadmin", requiredModule: "marketplace", enabled: true },
        { label: "Price List", href: "/staffadmin/price-list", icon: DollarSign, requiredRole: "staffadmin", requiredModule: "price_list", enabled: true },
        { label: "Mobile Master", href: "/staffadmin/mobile-master", icon: Database, requiredRole: "staffadmin", requiredModule: "brands", enabled: true },
        { label: "Accessories", href: "/staffadmin/accessories", icon: Tag, requiredRole: "staffadmin", requiredModule: "brands", enabled: true },
        { label: "Brands", href: "/staffadmin/brands", icon: Tag, requiredRole: "staffadmin", requiredModule: "brands", enabled: true },
        { label: "Device Verification", href: "/staffadmin/device-verification", icon: CheckCircle, requiredRole: "staffadmin", requiredModule: "device_verification", enabled: true },
        { label: "Orders", href: "/staffadmin/orders", icon: CreditCard, requiredRole: "staffadmin", requiredModule: "orders", enabled: true },
        { label: "Leads", href: "/staffadmin/leads", icon: User, requiredRole: "staffadmin", requiredModule: "valuation", enabled: true },
        { label: "Payouts", href: "/staffadmin/payouts", icon: DollarSign, requiredRole: "staffadmin", requiredModule: "payouts", enabled: true },
        { label: "Repairs", href: "/staffadmin/repairs", icon: Wrench, requiredRole: "staffadmin", requiredModule: "repairs", enabled: true },
        { label: "Unlocking", href: "/staffadmin/unlocking", icon: Unlock, requiredRole: "staffadmin", requiredModule: "unlocking", enabled: true },
        { label: "Listings", href: "/staffadmin/listings", icon: ShoppingBag, requiredRole: "staffadmin", requiredModule: "marketplace", enabled: true },
        { label: "Mail Box", href: "/staffadmin/messages", icon: MessageSquare, requiredRole: "staffadmin", requiredModule: "content", enabled: true },
        { label: "Analytics", href: "/staffadmin/analytics", icon: BarChart3, requiredRole: "staffadmin", requiredModule: "analytics", enabled: true },
        { label: "SEO Growth", href: "/staffadmin/seo", icon: Search, requiredRole: "staffadmin", requiredModule: "content", enabled: true },
        { label: "My Tasks", href: "/staffadmin/tasks", icon: Calendar, requiredRole: "staffadmin", requiredModule: "settings", enabled: true },
        { label: "My Performance", href: "/staffadmin/performance", icon: BarChart3, requiredRole: "staffadmin", requiredModule: "analytics", enabled: true },
      ],
    },
    {
      title: "Content Management",
      items: [
        { label: "Articles", href: "/staffadmin/articles", icon: FileText, requiredRole: "staffadmin", requiredModule: "content", enabled: true },
        { label: "Guides & FAQs", href: "/staffadmin/guides", icon: FileText, requiredRole: "staffadmin", requiredModule: "content", enabled: true },
        { label: "Content Pages", href: "/staffadmin/content", icon: FileText, requiredRole: "staffadmin", requiredModule: "content", enabled: true },
        { label: "Comments", href: "/staffadmin/comments", icon: MessageSquare, requiredRole: "staffadmin", requiredModule: "content", enabled: true },
        { label: "Polls", href: "/staffadmin/polls", icon: BarChart3, requiredRole: "staffadmin", requiredModule: "content", enabled: true },
      ],
    },
    {
      title: "System Control",
      items: [
        { label: "Subscriptions", href: "/staffadmin/subscriptions", icon: CreditCard, requiredRole: "staffadmin", requiredModule: "subscriptions", enabled: true },
        { label: "Valuation", href: "/staffadmin/valuation", icon: DollarSign, requiredRole: "staffadmin", requiredModule: "valuation", enabled: true },
        { label: "Themes", href: "/staffadmin/themes", icon: Eye, requiredRole: "staffadmin", requiredModule: "content", enabled: true },
        { label: "ChatBot Config", href: "/staffadmin/chatbot", icon: MessageSquare, requiredRole: "staffadmin", requiredModule: "content", enabled: true },
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
      title: "Store Operations",
      items: [
        { label: "Store Profile", href: "/storeadmin/profile", icon: Store, requiredRole: "storeadmin", enabled: true },
        { label: "Media & Branding", href: "/storeadmin/media", icon: ImageIcon, requiredRole: "storeadmin", enabled: true },
        { label: "Settings", href: "/storeadmin/settings", icon: Settings, requiredRole: "storeadmin", enabled: true },
        { label: "Theme Builder", href: "/storeadmin/theme", icon: Palette, requiredRole: "storeadmin", enabled: true },
        { label: "Inventory", href: "/storeadmin/products", icon: Package, requiredRole: "storeadmin", enabled: true },
        { label: "Accessories", href: "/storeadmin/accessories", icon: Smartphone, requiredRole: "storeadmin", enabled: true },
        { label: "Listings", href: "/storeadmin/listings", icon: ShoppingBag, requiredRole: "storeadmin", enabled: true },
        { label: "Orders", href: "/storeadmin/orders", icon: CreditCard, requiredRole: "storeadmin", enabled: true },
        { label: "Sell Leads", href: "/storeadmin/leads", icon: Smartphone, requiredRole: "storeadmin", enabled: true },
        { label: "Store Inquiries", href: "/storeadmin/store-leads", icon: User, requiredRole: "storeadmin", enabled: true },
        { label: "Exchanges", href: "/storeadmin/exchange", icon: RefreshCw, requiredRole: "storeadmin", enabled: true },
        { label: "Reviews", href: "/storeadmin/reviews", icon: Star, requiredRole: "storeadmin", enabled: true },
        { label: "Payouts", href: "/storeadmin/payouts", icon: DollarSign, requiredRole: "storeadmin", enabled: true },
        { label: "Payout Settings", href: "/storeadmin/payout-settings", icon: Settings, requiredRole: "storeadmin", enabled: true },
        { label: "Repair Services", href: "/storeadmin/repair-services", icon: Wrench, requiredRole: "storeadmin", enabled: true },
        { label: "Repair Requests", href: "/storeadmin/repairs", icon: Wrench, requiredRole: "storeadmin", enabled: true },
        { label: "Unlocking Requests", href: "/storeadmin/unlocking", icon: Unlock, requiredRole: "storeadmin", enabled: true },
        { label: "Store Staff", href: "/storeadmin/staff", icon: Users, requiredRole: "storeadmin", enabled: true },
        { label: "Subscription", href: "/storeadmin/my-subscription", icon: CreditCard, requiredRole: "storeadmin", enabled: true },
        { label: "Messages", href: "/storeadmin/messages", icon: MessageSquare, requiredRole: "storeadmin", enabled: true },
      ],
    },
    {
      title: "Account",
      items: [
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
