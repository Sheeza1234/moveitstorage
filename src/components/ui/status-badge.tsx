import * as React from "react";
import { cn } from "@/lib/utils";
import { LocationStatus, DocumentStatus, PaymentStatus } from "@/types";
import { LOCATION_STATUS_COLORS } from "@/lib/constants";

export type StatusType = LocationStatus | DocumentStatus | PaymentStatus | string;

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  status: StatusType;
  showDot?: boolean;
  size?: "sm" | "md";
}

export function StatusBadge({
  status,
  showDot = true,
  size = "md",
  className,
  ...props
}: StatusBadgeProps) {
  let label = String(status);
  let bgClass = "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
  let dotClass = "bg-slate-500";

  // Check if location status
  if (status in LOCATION_STATUS_COLORS) {
    const config = LOCATION_STATUS_COLORS[status as LocationStatus];
    label = config.label;
    bgClass = config.bg;
    dotClass = config.dot;
  } else {
    // Other statuses
    switch (status) {
      // Contract & Document Lifecycle Statuses
      case "ACTIVE":
      case "APPROVED":
      case "VALID":
        label = status === "ACTIVE" ? "Active" : status === "APPROVED" ? "Approved" : "Valid";
        bgClass = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400";
        dotClass = "bg-emerald-500";
        break;
      case "EXPIRING_SOON":
        label = "Expiring Soon";
        bgClass = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400";
        dotClass = "bg-amber-500";
        break;
      case "EXPIRED":
        label = "Expired";
        bgClass = "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400";
        dotClass = "bg-rose-500";
        break;
      case "DRAFT":
        label = "Draft";
        bgClass = "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300";
        dotClass = "bg-slate-400";
        break;
      case "PENDING_SIGNATURE":
      case "PENDING_REVIEW":
      case "PENDING":
      case "UPLOADED":
        label = status === "PENDING_SIGNATURE" ? "Pending Signature" : status === "PENDING_REVIEW" ? "Pending Review" : status === "UPLOADED" ? "Uploaded" : "Pending";
        bgClass = "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400";
        dotClass = "bg-sky-500";
        break;
      case "REJECTED":
        label = "Rejected";
        bgClass = "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300";
        dotClass = "bg-rose-600";
        break;
      case "TERMINATED":
        label = "Terminated";
        bgClass = "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400";
        dotClass = "bg-purple-500";
        break;
      case "MISSING":
        label = "Missing";
        bgClass = "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-300";
        dotClass = "bg-amber-600";
        break;

      // Payment Statuses
      case "PAID":
        label = "Paid";
        bgClass = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400";
        dotClass = "bg-emerald-500";
        break;
      case "OVERDUE":
        label = "Overdue";
        bgClass = "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400";
        dotClass = "bg-rose-500";
        break;
      case "CANCELLED":
        label = "Cancelled";
        bgClass = "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400";
        dotClass = "bg-slate-400";
        break;
      default:
        label = String(status).replace(/_/g, " ");
        break;
    }
  }

  const sizes = {
    sm: "px-2 py-0.5 text-[11px] gap-1.5 font-medium",
    md: "px-2.5 py-1 text-xs gap-1.5 font-medium",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border transition-all select-none",
        bgClass,
        sizes[size],
        className
      )}
      {...props}
    >
      {showDot && (
        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotClass)} />
      )}
      <span>{label}</span>
    </div>
  );
}
