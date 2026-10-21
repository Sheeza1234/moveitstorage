import { PermissionAction, PermissionModule } from "@/types/role";

/**
 * Which permission opens which screen. The sidebar, the route guard and the API all use the signed-in user's own
 * permission set (chosen by a Super Admin), so a user only sees - and can only open - what they were given.
 */
export interface AccessRule {
  prefix: string;
  /** menu label of the screen */
  title: string;
  /** false for sub-pages (e.g. "new allocation") that are not menu entries of their own */
  menu?: boolean;
  /** the user needs `action` (default VIEW) on ANY of these modules */
  modules: PermissionModule[];
  action?: PermissionAction;
}

export const ROUTE_RULES: AccessRule[] = [
  { prefix: "/allocations/new", title: "New allocation", menu: false, modules: ["ALLOCATIONS"], action: "CREATE" },
  { prefix: "/contracts/new", title: "New contract", menu: false, modules: ["CONTRACTS"], action: "CREATE" },
  { prefix: "/billing/new", title: "New invoice", menu: false, modules: ["BILLING"], action: "CREATE" },
  { prefix: "/users", title: "Users & Access", modules: ["SETTINGS"], action: "EDIT" },
  { prefix: "/warehouses", title: "Warehouses", modules: ["WAREHOUSES"] },
  { prefix: "/allocations", title: "Storage Allocations", modules: ["ALLOCATIONS"] },
  { prefix: "/booking-requests", title: "Booking Requests", modules: ["CUSTOMERS"] },
  { prefix: "/customers", title: "Customers", modules: ["CUSTOMERS"] },
  { prefix: "/inventory", title: "Inventory & Movement Logs", modules: ["INVENTORY"] },
  { prefix: "/packing-lists", title: "Packing Lists", modules: ["PACKING_LIST"] },
  { prefix: "/crew-sheets", title: "Crew Sheets", modules: ["CREW_SHEET"] },
  { prefix: "/employees", title: "Employees & Crew", modules: ["EMPLOYEES"] },
  { prefix: "/packing-materials", title: "Packing Materials", modules: ["PACKING_MATERIAL"] },
  { prefix: "/box-collections", title: "Box Collections", modules: ["BOX_COLLECTION"] },
  { prefix: "/contracts", title: "Contracts & Documents", modules: ["CONTRACTS", "DOCUMENTS"] },
  { prefix: "/walkthrough-disclaimers", title: "Walkthrough Disclaimers", modules: ["WALKTHROUGH"] },
  { prefix: "/billing", title: "Billing", modules: ["BILLING"] },
  { prefix: "/reports", title: "Operational Reports", modules: ["REPORTS"] },
  { prefix: "/audit", title: "Audit Trail", modules: ["AUDIT"] },
  { prefix: "/settings", title: "Settings & Storage Types", modules: ["SETTINGS"] },
];

export function ruleForPath(pathname: string): AccessRule | undefined {
  return ROUTE_RULES.filter((r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`)).sort((a, b) => b.prefix.length - a.prefix.length)[0];
}

export function ruleAllows(rule: AccessRule | undefined, has: (module: PermissionModule, action: PermissionAction) => boolean): boolean {
  if (!rule) return true; // dashboard, notifications and the sign-in page need no module
  return rule.modules.some((m) => has(m, rule.action ?? "VIEW"));
}
