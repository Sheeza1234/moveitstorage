import * as React from "react";
import { cn } from "@/lib/utils";

export interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
  badgeText?: string;
  badgeVariant?: "default" | "success" | "warning" | "danger" | "info";
  className?: string;
  onClick?: () => void;
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  badgeText,
  badgeVariant = "default",
  className,
  onClick,
}: MetricCardProps) {
  const isClickable = Boolean(onClick);

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-xl border border-moveit-border bg-moveit-card p-5 shadow-xs transition-all",
        isClickable && "cursor-pointer hover:border-moveit-orange/60 hover:shadow-md",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-moveit-muted uppercase tracking-wider">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold tracking-tight text-moveit-text">
              {value}
            </h3>
          </div>
          {subtitle && (
            <p className="text-xs text-moveit-muted">{subtitle}</p>
          )}
        </div>

        {icon && (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-moveit-surface text-moveit-text">
            {icon}
          </div>
        )}
      </div>

      {(trend || badgeText) && (
        <div className="mt-3 flex items-center justify-between border-t border-moveit-border-soft pt-2.5 text-xs">
          {trend && (
            <span
              className={cn(
                "inline-flex items-center gap-1 font-semibold",
                trend.isPositive ? "text-moveit-success" : "text-moveit-danger"
              )}
            >
              {trend.value}
              {trend.label && <span className="font-normal text-moveit-muted">{trend.label}</span>}
            </span>
          )}
          {badgeText && (
            <span
              className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-semibold",
                badgeVariant === "success" && "bg-moveit-success/15 text-moveit-success",
                badgeVariant === "danger" && "bg-moveit-danger/15 text-moveit-danger",
                badgeVariant === "warning" && "bg-moveit-warning/15 text-moveit-warning",
                badgeVariant === "info" && "bg-moveit-orange/15 text-moveit-orange",
                badgeVariant === "default" && "bg-moveit-surface text-moveit-text"
              )}
            >
              {badgeText}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
