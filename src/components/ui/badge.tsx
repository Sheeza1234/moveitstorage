import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline" | "success" | "warning" | "danger" | "info";
  size?: "sm" | "md";
}

export function Badge({
  className,
  variant = "default",
  size = "md",
  ...props
}: BadgeProps) {
  const variants = {
    default: "border-transparent bg-[#e96d09]/15 text-[#e96d09] dark:bg-[#e96d09]/20 dark:text-[#f37423]",
    secondary: "border-transparent bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
    outline: "border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-300",
    success: "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
    warning: "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
    danger: "border-transparent bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300",
    info: "border-transparent bg-[#e96d09]/10 text-[#e96d09] dark:bg-[#e96d09]/25 dark:text-[#f37423]",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-[10px] font-semibold",
    md: "px-2.5 py-0.5 text-xs font-semibold",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 font-medium tracking-wide",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}
