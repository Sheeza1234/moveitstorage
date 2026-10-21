"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Menu, 
  Bell, 
  Search, 
  Warehouse, 
  ChevronDown, 
  Check, 
  LogOut, 
  ShieldCheck, 
  Building2,
  Users,
  Layers,
  FileText,
  Receipt,
  X,
  CheckCheck,
  Sun,
  Moon
} from "lucide-react";
import * as DropdownPrimitive from "@radix-ui/react-dropdown-menu";
import { useUIStore } from "@/store/use-ui-store";
import { useAuthStore } from "@/store/use-auth-store";
import { services } from "@/services";
import { 
  Customer, 
  Warehouse as WarehouseType, 
  StorageAllocation, 
  InventoryRecord, 
  StorageContract, 
  StorageInvoice,
  OperationalNotification,
  USER_ROLES,
  UserRole
} from "@/types";
import { formatDateTime } from "@/lib/utils";

interface SearchResults {
  customers: Customer[];
  warehouses: WarehouseType[];
  allocations: StorageAllocation[];
  inventory: InventoryRecord[];
  contracts: StorageContract[];
  invoices: StorageInvoice[];
}

export function Header() {
  const router = useRouter();
  const { 
    toggleSidebar,
    toggleSidebarCollapsed,
    selectedWarehouseId, 
    setSelectedWarehouseId,
    globalSearchQuery,
    setGlobalSearchQuery,
    currentRole,
    theme,
    toggleTheme
  } = useUIStore();

  const authUser = useAuthStore((st) => st.user);
  const signOut = useAuthStore((st) => st.logout);
  const [warehouseList, setWarehouseList] = React.useState<{ id: string; name: string; code: string; location: string }[]>([]);
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<OperationalNotification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [searchResults, setSearchResults] = React.useState<SearchResults>({
    customers: [],
    warehouses: [],
    allocations: [],
    inventory: [],
    contracts: [],
    invoices: [],
  });
  const [isSearching, setIsSearching] = React.useState(false);

  // Fetch Unread & Notifications
  const loadNotifications = React.useCallback(async () => {
    try {
      const list = await services.notificationService.getNotifications();
      const count = await services.notificationService.getUnreadCount();
      setNotifications(list.slice(0, 8));
      setUnreadCount(count);
    } catch {
      // Ignore background errors
    }
  }, []);

  React.useEffect(() => {
    let mounted = true;
    services.notificationService.getNotifications().then((list) => {
      if (mounted) {
        setNotifications(list.slice(0, 8));
        setUnreadCount(list.filter((n) => !n.read).length);
      }
    }).catch(() => {});

    const interval = setInterval(loadNotifications, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [loadNotifications]);

  // Handle Mark As Read
  const handleMarkAsRead = async (id: string, actionUrl?: string) => {
    try {
      await services.notificationService.markAsRead(id);
      loadNotifications();
      if (actionUrl) {
        setNotificationsOpen(false);
        router.push(actionUrl);
      }
    } catch {
      if (actionUrl) router.push(actionUrl);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await services.notificationService.markAllAsRead();
      loadNotifications();
    } catch {
      // Ignore error
    }
  };

  // Live Multi-Entity Global Search
  React.useEffect(() => {
    if (!globalSearchQuery || globalSearchQuery.trim().length < 2) {
      return;
    }

    const q = globalSearchQuery.toLowerCase().trim();

    const timer = setTimeout(async () => {
      setIsSearching(true);
      setIsSearchOpen(true);
      try {
        // a module the user has no access to simply contributes no results
        const settle = async <T,>(p: Promise<T[]>): Promise<T[]> => p.catch(() => [] as T[]);
        const [custs, whs, allocs, pkgs, cnts, invs] = await Promise.all([
          settle(services.customerService.getCustomers()),
          settle(services.warehouseService.getWarehouses()),
          settle(services.allocationService.getAllocations()),
          settle(services.inventoryService.getInventoryRecords()),
          settle(services.contractService.getContracts()),
          settle(services.billingService.getInvoices()),
        ]);

        setSearchResults({
          customers: custs.filter(
            (c: Customer) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
          ).slice(0, 3),
          warehouses: whs.filter(
            (w: WarehouseType) => w.name.toLowerCase().includes(q) || w.code.toLowerCase().includes(q)
          ).slice(0, 3),
          allocations: allocs.filter(
            (a: StorageAllocation) => a.allocationCode.toLowerCase().includes(q) || a.customerName.toLowerCase().includes(q)
          ).slice(0, 3),
          inventory: pkgs.filter(
            (p: InventoryRecord) => p.id.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
          ).slice(0, 3),
          contracts: cnts.filter(
            (c: StorageContract) => c.contractCode.toLowerCase().includes(q) || c.customerName.toLowerCase().includes(q)
          ).slice(0, 3),
          invoices: invs.filter(
            (i: StorageInvoice) => i.invoiceNumber.toLowerCase().includes(q) || i.customerName.toLowerCase().includes(q)
          ).slice(0, 3),
        });
      } catch {
        // Fallback silently
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [globalSearchQuery]);

  React.useEffect(() => {
    let active = true;
    services.warehouseService
      .getWarehouses()
      .then((list) => active && setWarehouseList(list.map((w) => ({ id: w.id, name: w.name, code: w.code, location: w.location }))))
      .catch(() => active && setWarehouseList([]));
    return () => {
      active = false;
    };
  }, []);

  const activeWarehouse = React.useMemo(() => {
    if (selectedWarehouseId === "ALL") return { name: "All Warehouses", code: "GLOBAL" };
    const wh = warehouseList.find((w) => w.id === selectedWarehouseId);
    return wh ? { name: wh.name, code: wh.code } : { name: "All Warehouses", code: "GLOBAL" };
  }, [selectedWarehouseId, warehouseList]);

  const hasSearchResults = 
    searchResults.customers.length > 0 ||
    searchResults.warehouses.length > 0 ||
    searchResults.allocations.length > 0 ||
    searchResults.inventory.length > 0 ||
    searchResults.contracts.length > 0 ||
    searchResults.invoices.length > 0;

  return (
    <header className="z-30 flex h-16 w-full shrink-0 items-center justify-between gap-2 border-b border-moveit-border-soft bg-moveit-panel/80 px-3 backdrop-blur-xl sm:gap-3 sm:px-4 lg:px-6">
      {/* Left section: Mobile menu toggle + Warehouse context dropdown */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => (window.matchMedia("(min-width: 1024px)").matches ? toggleSidebarCollapsed() : toggleSidebar())}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-moveit-muted transition hover:bg-moveit-surface hover:text-moveit-orange cursor-pointer"
          aria-label="Toggle navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Warehouse Context Selector */}
        <DropdownPrimitive.Root>
          <DropdownPrimitive.Trigger asChild>
            <button className="flex h-10 items-center gap-2 rounded-full border border-moveit-border bg-moveit-panel px-4 text-xs font-semibold text-moveit-text transition hover:border-moveit-orange/50 hover:bg-moveit-surface cursor-pointer outline-none">
              <Warehouse className="h-3.5 w-3.5 text-moveit-orange" />
              <span className="hidden sm:inline-block max-w-[200px] truncate">{activeWarehouse.name}</span>
              <span className="sm:hidden">{activeWarehouse.code}</span>
              <ChevronDown className="h-3 w-3 text-moveit-muted" />
            </button>
          </DropdownPrimitive.Trigger>

          <DropdownPrimitive.Portal>
            <DropdownPrimitive.Content
              align="start"
              className="z-50 w-72 rounded-auth-lg border border-moveit-border bg-moveit-panel p-1.5 shadow-admin-soft animate-in fade-in-80 zoom-in-95"
            >
              <div className="px-2 py-1.5 text-[11px] font-bold text-moveit-muted uppercase tracking-wider">
                Select Storage Facility Context
              </div>
              <DropdownPrimitive.Item
                onClick={() => setSelectedWarehouseId("ALL")}
                className="flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium text-moveit-text hover:bg-moveit-surface cursor-pointer outline-none"
              >
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-moveit-orange" />
                  <span>All Warehouses (Global Summary)</span>
                </div>
                {selectedWarehouseId === "ALL" && <Check className="h-4 w-4 text-moveit-orange" />}
              </DropdownPrimitive.Item>

              <DropdownPrimitive.Separator className="my-1 h-px bg-moveit-border-soft" />

              {warehouseList.map((wh) => (
                <DropdownPrimitive.Item
                  key={wh.id}
                  onClick={() => setSelectedWarehouseId(wh.id)}
                  className="flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium text-moveit-text hover:bg-moveit-surface cursor-pointer outline-none"
                >
                  <div className="flex flex-col">
                    <span className="font-semibold text-moveit-text">{wh.name}</span>
                    <span className="text-[10px] text-moveit-muted">{wh.code} • {wh.location}</span>
                  </div>
                  {selectedWarehouseId === wh.id && <Check className="h-4 w-4 text-moveit-orange" />}
                </DropdownPrimitive.Item>
              ))}
            </DropdownPrimitive.Content>
          </DropdownPrimitive.Portal>
        </DropdownPrimitive.Root>
      </div>

      {/* Center section: Global Search Input & Live Results Overlay */}
      <div className="relative hidden md:flex flex-1 max-w-md mx-6">
        <div className="relative w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-moveit-muted pointer-events-none" />
          <input
            type="text"
            value={globalSearchQuery}
            onChange={(e) => {
              const val = e.target.value;
              setGlobalSearchQuery(val);
              if (val.trim().length < 2) setIsSearchOpen(false);
            }}
            onFocus={() => {
              if (globalSearchQuery.trim().length >= 2) setIsSearchOpen(true);
            }}
            placeholder="Search customers, allocations, packages, contracts, invoices..."
            className="h-11 w-full rounded-full border border-moveit-border bg-moveit-surface pl-10 pr-8 text-xs font-medium placeholder:text-moveit-muted focus:bg-moveit-panel focus:outline-none focus:ring-2 focus:ring-moveit-orange focus:border-moveit-orange text-moveit-text transition-colors"
          />
          {globalSearchQuery && (
            <button
              onClick={() => {
                setGlobalSearchQuery("");
                setIsSearchOpen(false);
              }}
              className="absolute right-2.5 top-2.5 text-moveit-muted hover:text-moveit-text"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Global Search Popover Card */}
        {isSearchOpen && (
          <div className="absolute top-11 left-0 w-full z-50 rounded-auth-lg border border-moveit-border bg-moveit-panel p-3 shadow-admin-soft animate-in fade-in-80 zoom-in-95 max-h-96 overflow-y-auto">
            {isSearching ? (
              <p className="p-3 text-center text-xs text-moveit-muted">Searching records...</p>
            ) : !hasSearchResults ? (
              <p className="p-3 text-center text-xs text-moveit-muted">No matching records found for &quot;{globalSearchQuery}&quot;</p>
            ) : (
              <div className="space-y-3">
                {/* Customers */}
                {searchResults.customers.length > 0 && (
                  <div>
                    <span className="flex items-center gap-1.5 text-[11px] font-bold text-moveit-muted uppercase tracking-wider mb-1">
                      <Users className="h-3 w-3 text-moveit-orange" /> Customers
                    </span>
                    {searchResults.customers.map((c) => (
                      <Link
                        key={c.id}
                        href={`/customers/${c.id}`}
                        onClick={() => setIsSearchOpen(false)}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-moveit-surface transition-colors text-xs font-medium"
                      >
                        <div>
                          <p className="text-moveit-text font-semibold">{c.name}</p>
                          <p className="text-[10px] text-moveit-muted">{c.code} • {c.email}</p>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-moveit-orange/15 text-moveit-orange font-semibold">Customer</span>
                      </Link>
                    ))}
                  </div>
                )}

                {/* Warehouses */}
                {searchResults.warehouses.length > 0 && (
                  <div>
                    <span className="flex items-center gap-1.5 text-[11px] font-bold text-moveit-muted uppercase tracking-wider mb-1">
                      <Building2 className="h-3 w-3 text-moveit-warning" /> Storage Facilities
                    </span>
                    {searchResults.warehouses.map((w) => (
                      <Link
                        key={w.id}
                        href={`/warehouses/${w.id}`}
                        onClick={() => setIsSearchOpen(false)}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-moveit-surface transition-colors text-xs font-medium"
                      >
                        <div>
                          <p className="text-moveit-text font-semibold">{w.name}</p>
                          <p className="text-[10px] text-moveit-muted">{w.code} • {w.location}</p>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-moveit-warning/15 text-moveit-warning font-semibold">Warehouse</span>
                      </Link>
                    ))}
                  </div>
                )}

                {/* Allocations */}
                {searchResults.allocations.length > 0 && (
                  <div>
                    <span className="flex items-center gap-1.5 text-[11px] font-bold text-moveit-muted uppercase tracking-wider mb-1">
                      <Layers className="h-3 w-3 text-moveit-orange" /> Storage Allocations
                    </span>
                    {searchResults.allocations.map((a) => (
                      <Link
                        key={a.id}
                        href={`/allocations/${a.id}`}
                        onClick={() => setIsSearchOpen(false)}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-moveit-surface transition-colors text-xs font-medium"
                      >
                        <div>
                          <p className="text-moveit-text font-semibold">{a.allocationCode}</p>
                          <p className="text-[10px] text-moveit-muted">{a.customerName} • {a.allocatedCapacity} SQ.FT</p>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-moveit-orange/15 text-moveit-orange font-semibold">Allocation</span>
                      </Link>
                    ))}
                  </div>
                )}

                {/* Contracts */}
                {searchResults.contracts.length > 0 && (
                  <div>
                    <span className="flex items-center gap-1.5 text-[11px] font-bold text-moveit-muted uppercase tracking-wider mb-1">
                      <FileText className="h-3 w-3 text-moveit-success" /> Contracts
                    </span>
                    {searchResults.contracts.map((c) => (
                      <Link
                        key={c.id}
                        href={`/contracts/${c.id}`}
                        onClick={() => setIsSearchOpen(false)}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-moveit-surface transition-colors text-xs font-medium"
                      >
                        <div>
                          <p className="text-moveit-text font-semibold">{c.contractCode}</p>
                          <p className="text-[10px] text-moveit-muted">{c.customerName} • {c.status}</p>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-moveit-success/15 text-moveit-success font-semibold">Contract</span>
                      </Link>
                    ))}
                  </div>
                )}

                {/* Invoices */}
                {searchResults.invoices.length > 0 && (
                  <div>
                    <span className="flex items-center gap-1.5 text-[11px] font-bold text-moveit-muted uppercase tracking-wider mb-1">
                      <Receipt className="h-3 w-3 text-moveit-orange" /> Invoices
                    </span>
                    {searchResults.invoices.map((i) => (
                      <Link
                        key={i.id}
                        href={`/billing/${i.id}`}
                        onClick={() => setIsSearchOpen(false)}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-moveit-surface transition-colors text-xs font-medium"
                      >
                        <div>
                          <p className="text-moveit-text font-semibold">{i.invoiceNumber}</p>
                          <p className="text-[10px] text-moveit-muted">{i.customerName} • AED {i.totalAmount.toLocaleString()}</p>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-moveit-orange/15 text-moveit-orange font-semibold">Invoice</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right section: Notifications Bell & User Profile Menu */}
      <div className="flex items-center gap-2">
        {/* Notifications Popover */}
        <DropdownPrimitive.Root open={notificationsOpen} onOpenChange={setNotificationsOpen}>
          <DropdownPrimitive.Trigger asChild>
            <button
              className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full border border-moveit-border bg-moveit-panel text-moveit-muted transition hover:border-moveit-orange/50 hover:bg-moveit-surface hover:text-moveit-orange cursor-pointer outline-none"
              aria-label="View notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-moveit-danger text-[10px] font-bold text-white shadow-xs">
                  {unreadCount}
                </span>
              )}
            </button>
          </DropdownPrimitive.Trigger>

          <DropdownPrimitive.Portal>
            <DropdownPrimitive.Content
              align="end"
              className="z-50 w-80 sm:w-96 rounded-auth-lg border border-moveit-border bg-moveit-panel p-0 shadow-admin-soft animate-in fade-in-80 zoom-in-95"
            >
              <div className="flex items-center justify-between border-b border-moveit-border-soft p-3.5">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-moveit-text">
                    Operational Alerts
                  </h4>
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-moveit-danger/15 px-2 py-0.5 text-[10px] font-bold text-moveit-danger">
                      {unreadCount} Unread
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="flex items-center gap-1 text-[11px] font-semibold text-moveit-orange hover:underline cursor-pointer"
                  >
                    <CheckCheck className="h-3.5 w-3.5" /> Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-moveit-border-soft">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-moveit-muted">No recent alerts</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleMarkAsRead(n.id, n.actionUrl)}
                      className={`p-3.5 hover:bg-moveit-surface transition-colors cursor-pointer ${
                        !n.read ? "bg-moveit-surface/50 font-medium" : ""
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <span
                          className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                            n.severity === "CRITICAL"
                              ? "bg-moveit-danger"
                              : n.severity === "WARNING"
                              ? "bg-moveit-warning"
                              : n.severity === "SUCCESS"
                              ? "bg-moveit-success"
                              : "bg-moveit-orange"
                          }`}
                        />
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-moveit-text">
                              {n.title}
                            </p>
                            <span className="text-[10px] text-moveit-muted shrink-0">
                              {formatDateTime(n.createdAt)}
                            </span>
                          </div>
                          <p className="text-[11px] text-moveit-muted leading-snug">
                            {n.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-moveit-border-soft p-2.5 text-center bg-moveit-surface">
                <Link
                  href="/notifications"
                  onClick={() => setNotificationsOpen(false)}
                  className="text-xs font-bold text-moveit-orange hover:text-moveit-orange-dark"
                >
                  View All Operational Notifications →
                </Link>
              </div>
            </DropdownPrimitive.Content>
          </DropdownPrimitive.Portal>
        </DropdownPrimitive.Root>

        {/* Theme Toggle Button (Light/Dark Mode) */}
        <button
          onClick={toggleTheme}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-moveit-border bg-moveit-panel text-moveit-muted transition hover:border-moveit-orange/50 hover:bg-moveit-surface hover:text-moveit-orange cursor-pointer outline-none"
          title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          aria-label="Toggle light and dark mode"
        >
          {theme === "dark" ? (
            <Sun className="h-5 w-5 text-moveit-orange" />
          ) : (
            <Moon className="h-5 w-5 text-moveit-text" />
          )}
        </button>

        <div className="h-5 w-px bg-moveit-border mx-1" />

        {/* Signed-in role badge (roles are assigned by a Super Admin, not switched here) */}
        <span className="hidden h-10 items-center gap-1.5 rounded-full border border-moveit-orange/30 bg-moveit-orange/10 px-3 text-xs font-semibold text-moveit-orange md:flex">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span className="max-w-[160px] truncate">{USER_ROLES.find((r) => r.id === currentRole)?.name || currentRole}</span>
        </span>

        <div className="h-5 w-px bg-moveit-border mx-1" />

        {/* User Profile Dropdown */}
        <DropdownPrimitive.Root>
          <DropdownPrimitive.Trigger asChild>
            <button className="flex items-center gap-2 rounded-auth-md border border-moveit-border bg-moveit-panel py-1 pl-1 pr-1.5 text-left text-xs font-semibold text-moveit-text shadow-sm transition hover:border-moveit-orange/50 cursor-pointer outline-none sm:pr-2.5">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-moveit-orange-light to-moveit-orange text-xs font-semibold text-white ring-2 ring-moveit-orange/15">
                {(authUser?.name ?? "?").split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
              </div>
              <span className="hidden sm:inline-block">{authUser?.name ?? ""}</span>
              <ChevronDown className="h-3 w-3 text-moveit-muted" />
            </button>
          </DropdownPrimitive.Trigger>

          <DropdownPrimitive.Portal>
            <DropdownPrimitive.Content
              align="end"
              className="z-50 w-56 rounded-auth-lg border border-moveit-border bg-moveit-panel p-1.5 shadow-admin-soft animate-in fade-in-80 zoom-in-95"
            >
              <div className="px-3 py-2 border-b border-moveit-border-soft mb-1">
                <p className="text-xs font-bold text-moveit-text">{authUser?.name}</p>
                <p className="text-[10px] text-moveit-muted">{authUser?.email}</p>
              </div>
              <DropdownPrimitive.Item asChild>
                <Link href="/settings" className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-moveit-text hover:bg-moveit-surface cursor-pointer outline-none">
                  <ShieldCheck className="h-4 w-4 text-moveit-muted" />
                  <span>Audit Trail & Settings</span>
                </Link>
              </DropdownPrimitive.Item>
              <DropdownPrimitive.Separator className="my-1 h-px bg-moveit-border-soft" />
              <DropdownPrimitive.Item
                onSelect={() => void signOut().then(() => router.replace("/login"))}
                className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-moveit-danger hover:bg-moveit-danger/10 cursor-pointer outline-none font-semibold"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </DropdownPrimitive.Item>
            </DropdownPrimitive.Content>
          </DropdownPrimitive.Portal>
        </DropdownPrimitive.Root>
      </div>
    </header>
  );
}

