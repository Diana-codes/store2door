import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Receipt,
  BookOpen,
  BookText,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";

export const navItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/sales", label: "Sales", icon: ShoppingBag },
  { href: "/purchases", label: "Purchases", icon: Package },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/cashbook", label: "Cashbook", icon: BookOpen },
  { href: "/ledger", label: "Ledger", icon: BookText },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];
