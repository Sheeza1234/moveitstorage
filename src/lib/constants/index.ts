export const LOCATION_STATUS_COLORS = {
  AVAILABLE: {
    label: "Available",
    bg: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
    dot: "bg-emerald-500",
    hex: "#10B981",
  },
  PARTIALLY_OCCUPIED: {
    label: "Partially Occupied",
    bg: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
    dot: "bg-amber-500",
    hex: "#F59E0B",
  },
  OCCUPIED: {
    label: "Occupied",
    bg: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800",
    dot: "bg-rose-500",
    hex: "#EF4444",
  },
  RESERVED: {
    label: "Reserved",
    bg: "bg-[#e96d09]/10 text-[#e96d09] border-[#e96d09]/30 dark:bg-[#e96d09]/20 dark:text-[#f37423] dark:border-[#e96d09]/50",
    dot: "bg-[#e96d09]",
    hex: "#e96d09",
  },
  BLOCKED: {
    label: "Blocked",
    bg: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    dot: "bg-slate-500",
    hex: "#64748B",
  },
} as const;

export const MOVEIT_BRAND = {
  name: "MoveIt Storage",
  subtitle: "Operations Management System",
  version: "v1.0.0",
  orange: "#e96d09",
  orangeLight: "#f37423",
  dark: "#232323",
  navy: "#0F172A",
};
