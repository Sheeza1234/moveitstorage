import { create } from "zustand";
import { UserRole, PermissionModule, PermissionAction, hasPermission } from "@/types";
import { setRpcRole } from "@/services";

export type ThemeMode = "dark" | "light";

interface UIState {
  /** mobile drawer */
  sidebarOpen: boolean;
  /** desktop: icon-only sidebar (remembered in localStorage) */
  sidebarCollapsed: boolean;
  toggleSidebarCollapsed: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  
  selectedWarehouseId: string; // 'ALL' or specific warehouse ID
  setSelectedWarehouseId: (id: string) => void;

  unreadNotificationCount: number;
  setUnreadNotificationCount: (count: number) => void;
  decrementUnreadCount: () => void;

  globalSearchQuery: string;
  setGlobalSearchQuery: (query: string) => void;

  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  checkPermission: (module: PermissionModule, action: PermissionAction) => boolean;

  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  sidebarOpen: false,
  sidebarCollapsed: false,
  toggleSidebarCollapsed: () =>
    set((state) => {
      const next = !state.sidebarCollapsed;
      if (typeof window !== "undefined") localStorage.setItem("moveit_storage_sidebar", next ? "collapsed" : "expanded");
      return { sidebarCollapsed: next };
    }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  selectedWarehouseId: "ALL",
  setSelectedWarehouseId: (id) => set({ selectedWarehouseId: id }),

  unreadNotificationCount: 3,
  setUnreadNotificationCount: (count) => set({ unreadNotificationCount: count }),
  decrementUnreadCount: () =>
    set((state) => ({ unreadNotificationCount: Math.max(0, state.unreadNotificationCount - 1) })),

  globalSearchQuery: "",
  setGlobalSearchQuery: (query) => set({ globalSearchQuery: query }),

  currentRole: "SUPER_ADMIN",
  setCurrentRole: (role) => {
    setRpcRole(role);
    set({ currentRole: role });
  },
  checkPermission: (module, action) => hasPermission(get().currentRole, module, action),

  theme: "light",
  toggleTheme: () => {
    const nextTheme = get().theme === "dark" ? "light" : "dark";
    if (typeof window !== "undefined") {
      document.documentElement.setAttribute("data-theme", nextTheme);
      if (nextTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      localStorage.setItem("moveit_theme", nextTheme);
    }
    set({ theme: nextTheme });
  },
  setTheme: (t) => {
    if (typeof window !== "undefined") {
      document.documentElement.setAttribute("data-theme", t);
      if (t === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      localStorage.setItem("moveit_theme", t);
    }
    set({ theme: t });
  },
}));
