"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Warehouse, 
  Layers, 
  Sliders, 
  Users, 
  Package, 
  ArrowLeftRight, 
  FileCheck2, 
  Receipt, 
  BellRing,
  X,
  Boxes,
  BarChart3,
  PackageCheck,
  UserCog,
  Inbox
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/use-ui-store";
import { MoveitLogo } from "@/components/brand/moveit-logo";
import { useAuthStore } from "@/store/use-auth-store";
import { ruleAllows, ruleForPath } from "@/lib/access";
import { hasPermission } from "@/types";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface NavGroup {
  groupTitle: string;
  items: NavItem[];
}

const NAVIGATION_GROUPS: NavGroup[] = [
  {
    groupTitle: "OVERVIEW",
    items: [
      { title: "Dashboard", href: "/", icon: LayoutDashboard },
    ],
  },
  {
    groupTitle: "STORAGE OPERATIONS",
    items: [
      { title: "Warehouses", href: "/warehouses", icon: Warehouse },
      { title: "Storage Allocations", href: "/allocations", icon: Layers },
      { title: "Storage Types", href: "/settings", icon: Sliders },
    ],
  },
  {
    groupTitle: "CUSTOMER HUB",
    items: [
      { title: "Booking Requests", href: "/booking-requests", icon: Inbox },
      { title: "Customers", href: "/customers", icon: Users },
    ],
  },
  {
    groupTitle: "INVENTORY & MOVEMENT",
    items: [
      { title: "Inventory", href: "/inventory", icon: Package },
      { title: "Packing Lists", href: "/packing-lists", icon: Boxes },
      { title: "Crew Sheets", href: "/crew-sheets", icon: FileCheck2 },
      { title: "Employees & Crew", href: "/employees", icon: Users },
      { title: "Packing Materials", href: "/packing-materials", icon: Boxes },
      { title: "Box Collections", href: "/box-collections", icon: PackageCheck },
      { title: "Movement Logs", href: "/inventory/movements", icon: ArrowLeftRight },
    ],
  },
  {
    groupTitle: "COMPLIANCE & FINANCE",
    items: [
      { title: "Contracts & Documents", href: "/contracts", icon: FileCheck2 },
      { title: "Walkthrough Disclaimers", href: "/walkthrough-disclaimers", icon: FileCheck2 },
      { title: "Billing", href: "/billing", icon: Receipt },
      { title: "Operational Reports", href: "/reports", icon: BarChart3 },
    ],
  },
  {
    groupTitle: "SYSTEM",
    items: [
      { title: "Notifications", href: "/notifications", icon: BellRing, badge: "3" },
      { title: "Users & Access", href: "/users", icon: UserCog },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen, sidebarCollapsed, unreadNotificationCount } = useUIStore();
  const user = useAuthStore((s) => s.user);
  // each user only sees the entries their permissions allow (empty groups disappear)
  const groups = NAVIGATION_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => !user || ruleAllows(ruleForPath(i.href), (m, a) => hasPermission(user.role, m, a))),
  })).filter((g) => g.items.length > 0);

  // desktop can collapse to icons; the mobile drawer is always full width
  const isCollapsed = sidebarCollapsed && !sidebarOpen;

  return (
    <>
      {/* Mobile backdrop */}
      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-40 bg-black/60 lg:hidden" />}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-full w-[17.5rem] max-w-[86vw] shrink-0 flex-col border-r border-moveit-sidebar-border bg-moveit-sidebar text-moveit-sidebar-text shadow-2xl shadow-black/10 transition-all duration-300 dark:shadow-black/25 lg:static lg:translate-x-0",
          isCollapsed ? "lg:w-[5.4rem]" : "lg:w-[17.5rem]",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand header */}
        <div className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-moveit-sidebar-border px-4">
          {isCollapsed ? (
            <Link
              href="/"
              title="Moveit 24/7 Storage"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-auth-md bg-gradient-to-br from-moveit-orange-light to-moveit-orange text-sm font-semibold text-white shadow-lg shadow-black/15"
            >
              M
            </Link>
          ) : (
            <Link href="/" className="flex min-w-0 items-center gap-2.5">
              <MoveitLogo priority className="h-14" />
              <span className="rounded-full border border-moveit-orange/30 bg-moveit-orange/10 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-moveit-orange">Storage</span>
            </Link>
          )}
          <button
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
            className="rounded-lg p-1 text-moveit-sidebar-muted transition-colors hover:bg-moveit-sidebar-soft hover:text-moveit-sidebar-text lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Grouped, permission-filtered navigation */}
        <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4" aria-label="Main">
          {groups.map((group) => (
            <div key={group.groupTitle} className="mb-5">
              {!isCollapsed && (
                <p className="mb-2 px-3 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-moveit-sidebar-dim">{group.groupTitle}</p>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;
                  const badge = item.href === "/notifications" && unreadNotificationCount > 0 ? String(unreadNotificationCount > 99 ? "99+" : unreadNotificationCount) : undefined;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      title={isCollapsed ? item.title : undefined}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex min-h-11 w-full items-center gap-3 overflow-hidden rounded-auth-md px-3 text-left text-sm transition-all duration-200",
                        active
                          ? "bg-gradient-to-r from-moveit-orange to-moveit-orange-light text-white shadow-auth-orange before:absolute before:left-0 before:top-1/2 before:h-7 before:w-[3px] before:-translate-y-1/2 before:rounded-r-full before:bg-white before:shadow-[0_0_10px_rgba(255,255,255,0.6)]"
                          : "text-moveit-sidebar-muted hover:translate-x-0.5 hover:bg-moveit-sidebar-soft hover:text-moveit-sidebar-text"
                      )}
                    >
                      <span
                        className={cn(
                          "grid h-7 w-7 shrink-0 place-items-center rounded-auth-sm",
                          active ? "bg-white/20 text-white" : "bg-moveit-sidebar-soft text-moveit-sidebar-muted group-hover:text-moveit-sidebar-text"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      {!isCollapsed && (
                        <>
                          <span className="min-w-0 flex-1 truncate font-medium">{item.title}</span>
                          {badge && (
                            <span className="ml-auto grid h-4 min-w-4 place-items-center rounded-full bg-moveit-orange px-1 text-[0.6rem] font-bold text-white">{badge}</span>
                          )}
                        </>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
