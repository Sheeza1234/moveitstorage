import * as React from "react";
import { FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/40",
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 mb-3">
        {icon || <FolderOpen className="h-6 w-6" />}
      </div>
      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{title}</h3>
      {description && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction} className="mt-4">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
